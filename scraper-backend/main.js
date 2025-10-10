
import fs from "fs";

const VALID_PERIODS = new Set(["day", "week", "month", "all"]);
const VALID_CATEGORIES = new Set(["overall", "politics", "sports", "crypto", "culture", "mentions", "weather", "economics"]);
const VALID_ORDER_BY = new Set(["PNL", "VOL"]);

// const SLUG_CATEGORY_LOOKUP = {
//   "overall": [],
//   "politics": [],
//   "sports": [],
//   "crypto": [],
//   "culture": [],
//   "mentions": [],
//   "weather": [],
//   "economics": [],
// };

const SLUG_CATEGORY_LOOKUP = JSON.parse(fs.readFileSync("full_categories.json", "utf8"));

/**
 * Fetch all event slugs for a single tag_slug from Polymarket's gamma API,
 * walking pagination until exhausted or a max page limit is reached.
 *
 * @param {string} tagSlug - e.g., "politics", "sports", ...
 * @param {Object} [opts]
 * @param {number} [opts.limitPerPage=50] - page size (max is 50)
 * @param {number} [opts.maxPages=20] - safety bound on pages to fetch
 * @param {number} [opts.offset=0] - initial offset
 * @param {object} [opts.queryOverrides] - extra query params to merge/override
 *   (e.g., { active: true, archived: false, closed: true, order: "volume24hr", ascending: false })
 * @param {number} [opts.msSleep=10] - optional backoff between requests
 * @returns {Promise<string[]>} array of slugs (deduped)
 */
export async function fetchClosedEventSlugsForTag(tagSlug, {
    limitPerPage = 50,
    maxPages = 20,
    offset = 0,
    queryOverrides = {
        active: "true",
        archived: "false",
        closed: "true",
        order: "new",
        ascending: "false",
    },
    msSleep = 10,
} = {}) {
    if (!tagSlug || typeof tagSlug !== "string") {
        throw new Error("tagSlug must be a non-empty string");
    }
    if (!Number.isInteger(limitPerPage) || limitPerPage < 1 || limitPerPage > 50) {
        throw new Error("limitPerPage must be >0 and <=50");
    }
    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("offset must be a non-negative integer");
    }

    const base = "https://gamma-api.polymarket.com/events/pagination";
    const slugs = new Set();
    let pages = 0;

    while (pages < maxPages) {
        const params = new URLSearchParams({
            limit: String(limitPerPage),
            active: "true",
            archived: "false",
            tag_slug: tagSlug,
            closed: "true",
            order: "new",
            ascending: "false",
            offset: String(offset + pages * limitPerPage),
            ...Object.fromEntries(Object.entries(queryOverrides || {}).map(([k, v]) => [k, String(v)])),
        });

        const url = `${base}?${params.toString()}`;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
        }

        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        for (const row of rows) {
            if (row?.slug) slugs.add(String(row.slug));
        }

        // Pagination exit condition
        if (rows.length < limitPerPage) break;

        offset += rows.length;
        pages += 1;

        await new Promise(resolve => setTimeout(resolve, msSleep));
    }

    return [...slugs];
}

/**
 * Warm up the SLUG_CATEGORY_LOOKUP with the newest events.
 *
 * @param {string[]} [tags] - e.g., ["politics", "sports"]
 * @param {Object} [opts] - forwarded to fetchClosedEventSlugsForTag
 * @param {Object<string,string[]>} [seedLookup] - existing lookup to append into
 * @returns {Promise<Object<string,string[]>>} the populated lookup
 */
export async function warmUpSlugCategoryLookup(tags=VALID_CATEGORIES, opts = { limitPerPage: 50, maxPages: 2 }, seedLookup = SLUG_CATEGORY_LOOKUP) {
    if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error("tags must be a non-empty array of strings");
    }

    // Make a shallow copy so we don't mutate the original object by surprise
    const out = { ...seedLookup };
    for (const tag of tags) {
        const key = String(tag);
        if (!out[key]) out[key] = []; // create bucket if not present

        const currentSet = new Set(out[key]);
        const slugs = await fetchClosedEventSlugsForTag(tag, opts);
        for (const s of slugs) currentSet.add(s);
        out[key] = [...currentSet];
    }
    return out;
}

/* ======================
   Example usage (uncomment to test)

(async () => {
    // Fetch just politics slugs and append them to the "politics" array
    const politicsSlugs = await fetchAllEventSlugsForTag("politics", { limitPerPage: 50 });
    console.log("Politics slugs:", politicsSlugs.slice(0, 5));

    // Build a full lookup for several categories
    const lookup = await buildSlugCategoryLookup(
        ["politics", "sports", "crypto"],
        { limitPerPage: 100 } // you can also set maxPages, queryOverrides, etc.
    );
    console.log(JSON.stringify(lookup, null, 2));
})();
*/

/**
 * Fetch all closed positions for a wallet address from Polymarket's data API.
 * @param {string} walletAddress - The wallet address to fetch positions for
 * @param {Object} [opts]
 * @param {number} [opts.limit=25] - Number of positions per page (max 25)
 * @param {number} [opts.msSleep=10] - Delay between API calls in milliseconds
 * @param {string} [opts.sortBy="avgprice"] - Sort field for positions
 * @param {string} [opts.sortDirection="DESC"] - Sort direction
 * @returns {Promise<Array>} Array of closed positions
 */
async function fetchClosedPositionsForWallet(walletAddress, {
    limit = 25,
    msSleep = 10,
    sortBy = "avgprice",
    sortDirection = "DESC"
} = {}) {
    if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("walletAddress must be a non-empty string");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
        throw new Error("limit must be between 1 and 25");
    }

    const allPositions = [];
    let offset = 0;
    let hasMorePages = true;

    while (hasMorePages) {
        const params = new URLSearchParams({
            user: walletAddress,
            sortBy: sortBy,
            sortDirection: sortDirection,
            limit: String(limit),
            offset: String(offset),
        });

        const url = `https://data-api.polymarket.com/closed-positions?${params.toString()}`;
        
        try {
            const res = await fetch(url, { headers: { accept: "application/json" } });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error(`Failed to fetch closed positions for wallet ${walletAddress} (offset ${offset}): ${res.status} - ${text || res.statusText}`);
                break; // Stop processing on API error
            }

            const json = await res.json();
            // The API might return an array directly or an object with a 'data' array
            const positions = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

            if (positions.length === 0) {
                hasMorePages = false; // No more positions for this wallet
            } else {
                allPositions.push(...positions); // Accumulate all positions
                // If fewer positions than the limit were returned, it's the last page
                if (positions.length < limit) {
                    hasMorePages = false;
                } else {
                    offset += limit; // Increment offset for the next page
                    await new Promise(resolve => setTimeout(resolve, msSleep)); // Wait before making the next request
                }
            }
        } catch (error) {
            console.error(`Error fetching closed positions for wallet ${walletAddress} (offset ${offset}):`, error);
            break; // Stop processing on network or parsing error
        }
    }

    return allPositions;
}

/**
 * Backtest a category by fetching the closed positions of each wallet and calculating the PNL for each whale wallet.
 * @param {*} initialBalance // initial balance
 * @param {*} positionPercentage // position percentage
 * @param {*} portfolio // list of addresses
 * @param {*} category 
 */
async function backtestPortfolioOnCategory(initialBalance, positionPercentage, portfolio, categories, lookup) {
    if (!Array.isArray(portfolio) || portfolio.length === 0) {
        throw new Error("portfolio must be a non-empty array of wallet addresses");
    }
    // Validate categories: must be a non-empty array of valid category strings
    if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error("categories must be a non-empty array of strings");
    }
    for (const cat of categories) {
        if (typeof cat !== "string" || !VALID_CATEGORIES.has(cat)) {
            throw new Error(`Each category in the 'categories' array must be a valid string from ${[...VALID_CATEGORIES].join(", ")}. Invalid category: "${cat}"`);
        }
    }

    // This object will store the results: walletAddress -> category -> { initialBalance, finalBalance, actualPnl }
    const walletCategoryResults = {};

    const limit = 25; // API limit per page
    const msSleep = 1; // Small delay between API calls to prevent rate limiting

    for (const walletAddress of portfolio) {
        walletCategoryResults[walletAddress] = {}; // Initialize results for this specific wallet

        // --- Step 1: Fetch all closed positions for the current wallet once ---
        // This optimizes by avoiding refetching the same data for each category.
        let allWalletPositions;
        const walletFileName = `${walletAddress}.json`;
        console.log(walletFileName)

        if (fs.existsSync(walletFileName)) {
            console.log(`Loading positions for wallet ${walletAddress} from file: ${walletFileName}`);
            const fileContent = fs.readFileSync(walletFileName, "utf8");
            allWalletPositions = JSON.parse(fileContent);
        } else {
            allWalletPositions = await fetchClosedPositionsForWallet(walletAddress, {
                limit: limit,
                msSleep: msSleep,
                sortBy: "avgprice", // Keeping original sort, but note for true chronological backtest, positions should be sorted by time.
                sortDirection: "DESC"
            });
            // Save the fetched positions to a file for future use
            fs.writeFileSync(walletFileName, JSON.stringify(allWalletPositions, null, 2), "utf8");
            console.log(`Saved positions for wallet ${walletAddress} to file: ${walletFileName}`);
        }
        // const allWalletPositions = await fetchClosedPositionsForWallet(walletAddress, {
        //     limit: limit,
        //     msSleep: msSleep,
        //     sortBy: "avgprice", // Keeping original sort, but note for true chronological backtest, positions should be sorted by time.
        //     sortDirection: "DESC"
        // });

        // --- Step 2: Process the fetched positions for each specified category separately ---
        for (const category of categories) {
            // For each category, start with the initial balance and reset PNLs
            let currentBalanceForCategory = initialBalance;
            let currentActualPnlForCategory = 0;
            const balanceHistory = [initialBalance]; // Track balance progression

            // Convert the category slugs array to a Set for efficient lookups
            const categorySlugs = new Set(lookup[category] || []);

            if (categorySlugs.size === 0) {
                console.warn(`No slugs found for category "${category}" in SLUG_CATEGORY_LOOKUP for wallet ${walletAddress}.`);
                // Initialize results to initial balance and 0 PNL if no slugs are found for this category
                walletCategoryResults[walletAddress][category] = {
                    initialBalance: initialBalance,
                    finalBalance: initialBalance, // Balance remains initial if no relevant positions
                    actualPnl: 0,
                    history: [initialBalance]
                };
                continue; // Move to the next category for this wallet
            }

            for (const position of allWalletPositions) {
                // Check if the position's slug is relevant to the current category
                if (position?.slug && categorySlugs.has(position.slug)) {
                    // Apply percentage-based PNL to the current balance for this category
                    currentBalanceForCategory += currentBalanceForCategory * positionPercentage * Math.sign(Number(position.realizedPnl || 0));
                    // Accumulate actual realized PNL for this category
                    currentActualPnlForCategory += Number(position.realizedPnl || 0); // Add realized PNL, default to 0 if undefined
                    
                    // Record the balance after this position
                    balanceHistory.push(currentBalanceForCategory);
                }
            }

            // Store the results for this specific category and wallet
            walletCategoryResults[walletAddress][category] = {
                initialBalance: initialBalance,
                finalBalance: currentBalanceForCategory, // The balance after applying percentage-based PNLs
                actualPnl: currentActualPnlForCategory, // The sum of actual realized PNLs
                history: balanceHistory // The balance progression over time
            };
        }
    }

    return walletCategoryResults;
};



/**
 * Fetch Polymarket leaderboard entries.
 * @param {Object} opts
 * @param {number} [opts.limit=20] - Positive integer.
 * @param {"day"|"week"|"month"|"all"} [opts.timePeriod="all"]
 * @param {"PNL"|"VOL"} [opts.orderBy="PNL"]
 * @param {"overall", "politics", "sports", "crypto", "culture", "mentions", "weather", "economics"} [opts.category="overall"]
 * @param {number} [opts.offset=0] - Non-negative integer.
 * @returns {Promise<Array<{rank:string, proxyWallet:string, userName:string, vol:number, pnl:number, profileImage:string}>>}
 */
async function fetchPolymarketLeaderboard({
  limit = 20,
  timePeriod = "all",
  orderBy = "PNL",
  category = "overall",
  offset = 0,
} = {}) {
  // basic validation
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }
  if (!VALID_PERIODS.has(String(timePeriod).toLowerCase())) {
    throw new Error('timePeriod must be one of: "day", "week", "month", "all"');
  }
  if (!VALID_ORDER_BY.has(String(orderBy).toUpperCase())) {
    throw new Error('orderBy must be one of: "PNL", "VOL"');
  }
  if (!VALID_CATEGORIES.has(String(category).toLowerCase())) {
    throw new Error('category must be one of: "politics", "sports", "crypto", "culture", "mentions", "weather", "economics"');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("offset must be a non-negative integer");
  }

  const params = new URLSearchParams({
    timePeriod: String(timePeriod).toLowerCase(),
    orderBy: String(orderBy).toUpperCase(),
    limit: String(limit),
    offset: String(offset),
    category: String(category),
  });

  const url = `https://data-api.polymarket.com/v1/leaderboard?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  const body = await res.json();
  const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];

  // Map to your exact output structure
  return rows.map((item, i) => ({
    rank: String(item.rank ?? i + 1),
    proxyWallet: item.proxyWallet ?? item.address ?? "",
    userName: item.userName ?? item.username ?? "",
    vol: Number(item.vol ?? item.volume ?? 0),
    pnl: Number(item.pnl ?? item.PNL ?? 0),
    profileImage: item.profileImage ?? item.avatar ?? "",
  }));
}

// ESM default/named export
export { 
    fetchPolymarketLeaderboard, 
    fetchClosedPositionsForWallet,
    backtestPortfolioOnCategory,
    SLUG_CATEGORY_LOOKUP,
    VALID_CATEGORIES
};
export default fetchPolymarketLeaderboard;

// CommonJS fallback (if you `require` this file)
if (typeof module !== "undefined") {
  module.exports = { 
    fetchPolymarketLeaderboard, 
    fetchClosedPositionsForWallet,
    backtestPortfolioOnCategory,
    SLUG_CATEGORY_LOOKUP,
    VALID_CATEGORIES
  };
}

/* Example usage (uncomment to test):
(async () => {
  const data = await fetchPolymarketLeaderboard({ limit: 10, timePeriod: "week" });
  console.log(data);
})();
*/

(async () => {
    // // Fetch leaderboard for each valid category and time period, save to separate files
    // const timePeriods = ["day", "week", "month", "all"];
    
    // for (const category of VALID_CATEGORIES) {
    //     for (const timePeriod of timePeriods) {
    //         try {
    //             console.log(`Fetching leaderboard for category: ${category}, timePeriod: ${timePeriod}`);
    //             const leaderboard = await fetchPolymarketLeaderboard({ 
    //                 limit: 15, 
    //                 timePeriod: timePeriod, 
    //                 orderBy: "PNL",
    //                 category: category
    //             });
                
    //             const fileName = `leaderboard_${category}_${timePeriod}.json`;
    //             fs.writeFileSync(fileName, JSON.stringify(leaderboard, null, 2), "utf8");
    //             console.log(`Saved leaderboard for ${category} (${timePeriod}) to ${fileName} (${leaderboard.length} entries)`);
                
    //             // Small delay between requests to be respectful to the API
    //             await new Promise(resolve => setTimeout(resolve, 100));
    //         } catch (error) {
    //             console.error(`Error fetching leaderboard for category ${category}, timePeriod ${timePeriod}:`, error);
    //         }
    //     }
    // }
    
    // console.log("Finished fetching all category leaderboards for all time periods");

    // Collect all addresses from leaderboard files (all time periods)
    const portfolio = new Set(); // Use Set to avoid duplicates
    
    for (const category of VALID_CATEGORIES) {
        for (const timePeriod of ["day", "week", "month", "all"]) {
            const fileName = `leaderboard_${category}_${timePeriod}.json`;
            try {
                if (fs.existsSync(fileName)) {
                    console.log(`Reading addresses from ${fileName}`);
                    const fileContent = fs.readFileSync(fileName, "utf8");
                    const leaderboard = JSON.parse(fileContent);
                    
                    // Extract addresses from each leaderboard entry
                    for (const entry of leaderboard) {
                        if (entry.proxyWallet && entry.proxyWallet.trim() !== "") {
                            portfolio.add(entry.proxyWallet);
                        }
                    }
                    console.log(`Added ${leaderboard.length} entries from ${category} (${timePeriod}), total unique addresses: ${portfolio.size}`);
                } else {
                    console.log(`File ${fileName} not found, skipping...`);
                }
            } catch (error) {
                console.error(`Error reading ${fileName}:`, error);
            }
        }
    }
    
    // Convert Set to Array
    const portfolioArray = Array.from(portfolio);
    console.log(`Final portfolio size: ${portfolioArray.length} unique addresses`);
    
    let lookup = SLUG_CATEGORY_LOOKUP;
    // const portfolio = ["0x56687bf447db6ffa42ffe2204a05edaa20f55839"];

    // let positions = await fetchClosedPositionsForWallet(portfolio[0],     { limit: 25, msSleep: 10, sortBy:     "avgprice", sortDirection: "DESC" });
    // console.log(JSON.stringify(positions,     null, 2));
    const categories = Array.from(VALID_CATEGORIES);
    const pnls = await backtestPortfolioOnCategory(1000, 0.02, portfolioArray, categories, lookup);
    console.log(JSON.stringify(pnls, null, 2));
})();


/**
 * FestFlow API Service Module for Sirajul Irfan (Event Euphoria)
 * Base URL: https://euphoria.festflow.com/api/public
 * API Key: 1b1ee2866922da7a292e6cba9773f95e40ef04cb8b6ab04f34252f1f395225f9
 */

const FESTFLOW_BASE_URL = process.env.FESTFLOW_BASE_URL || 'https://euphoria.festflow.com/api/public';
const FESTFLOW_API_KEY = process.env.FESTFLOW_API_KEY || '1b1ee2866922da7a292e6cba9773f95e40ef04cb8b6ab04f34252f1f395225f9';
const REQUEST_TIMEOUT_MS = parseInt(process.env.FESTFLOW_TIMEOUT_MS, 10) || 10000;
const ALLOW_FALLBACK = process.env.ALLOW_FESTFLOW_FALLBACK !== 'false';

// Default Fallback House Standings Data
const FALLBACK_HOUSES = [
    { name: 'Phoenix', rank: 1, points: 1480, progress: 92, captain: 'Irfan K.', firstPrizes: 24, badge: 'Current Lead', badgeClass: 'bg-amber-400 text-slate-950', barGradient: 'from-amber-500 to-amber-300' },
    { name: 'Dragon', rank: 2, points: 1410, progress: 88, captain: 'Rayan M.', firstPrizes: 21, badge: 'Runner Up', badgeClass: 'bg-slate-800 text-emerald-400 border border-emerald-500/30', barGradient: 'from-emerald-500 to-emerald-300' },
    { name: 'Griffin', rank: 3, points: 1360, progress: 85, captain: 'Sufiyan A.', firstPrizes: 18, badge: '', badgeClass: '', barGradient: 'from-cyan-500 to-cyan-300' },
    { name: 'Centaur', rank: 4, points: 1290, progress: 80, captain: 'Bilal T.', firstPrizes: 15, badge: '', badgeClass: '', barGradient: 'from-purple-500 to-purple-300' }
];

// Published FestFlow Competition Payload ("Ad Making" under "ALPHA ZONE")
const FALLBACK_COMPETITIONS = [
    {
        id: 'c_ad_making',
        code: '01',
        formattedCode: '01',
        title: 'Ad Making',
        category: 'ALPHA ZONE',
        stage: 'Main Stage A',
        status: 'Published',
        winners: [
            {
                prize: '1st',
                rank: '1st',
                isFirst: true,
                chestNo: 'AZ005',
                participant: 'Midjaluj Aman k',
                name: 'Midjaluj Aman k',
                team: 'Phoenix',
                location: '',
                grade: 'A',
                points: 10
            },
            {
                prize: '2nd',
                rank: '2nd',
                isSecond: true,
                chestNo: 'AZ001',
                participant: 'Muhammed Swalih c',
                name: 'Muhammed Swalih c',
                team: 'Dragon',
                location: '',
                grade: 'C',
                points: 4
            },
            {
                prize: '3rd',
                rank: '3rd',
                isThird: true,
                chestNo: 'AZ008',
                participant: 'Muhammed Jabir vk',
                name: 'Muhammed Jabir vk',
                team: 'Griffin',
                location: '',
                grade: '', // Completely empty grade for 3rd prize winner
                points: 1
            }
        ]
    }
];

/**
 * Helper to fetch API with timeout signal, User-Agent, and 3x automatic retries
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, timeoutMs = REQUEST_TIMEOUT_MS) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'x-api-key': FESTFLOW_API_KEY,
                    'Accept': 'application/json, text/plain, */*',
                    'Cache-Control': 'no-cache',
                    ...options.headers
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            lastError = err;
            const errDetails = err.cause ? `${err.cause.code || err.cause.message} (${err.cause.hostname || ''})` : (err.code || err.message);
            console.warn(`[FestFlow API Fetch Attempt ${attempt}/${maxRetries} Failed]: ${url} -> ${errDetails}`);
            
            if (attempt < maxRetries) {
                await new Promise(res => setTimeout(res, attempt * 500)); // Exponential backoff (500ms, 1000ms)
            }
        }
    }
    throw lastError;
}

/**
 * Helper to extract array from any deep JSON response path
 */
function extractArrayPayload(rawData, primaryKeys = []) {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;

    if (typeof rawData === 'object') {
        for (const key of primaryKeys) {
            if (Array.isArray(rawData[key])) return rawData[key];
        }
        if (Array.isArray(rawData.competitions)) return rawData.competitions;
        if (Array.isArray(rawData.data)) return rawData.data;
        if (rawData.data && Array.isArray(rawData.data.competitions)) return rawData.data.competitions;
        if (Array.isArray(rawData.results)) return rawData.results;
        if (Array.isArray(rawData.items)) return rawData.items;
        if (Array.isArray(rawData.houses)) return rawData.houses;
        if (Array.isArray(rawData.teams)) return rawData.teams;
    }
    return [];
}

/**
 * Robust Multi-Layer Team Property Extraction
 */
function extractTeamName(w) {
    if (!w) return 'House';

    let rawTeam = null;

    if (w.team && typeof w.team === 'object') {
        rawTeam = w.team.name || w.team.title || w.team.houseName || w.team.label || w.team.code || w.team.name_en;
    } else if (w.house && typeof w.house === 'object') {
        rawTeam = w.house.name || w.house.title || w.house.label;
    } else if (w.group && typeof w.group === 'object') {
        rawTeam = w.group.name || w.group.title || w.group.label;
    }

    if (!rawTeam) {
        rawTeam = w.team || w.teamName || w.team_name || w.house || w.houseName || w.group || w.groupName || 'House';
    }

    if (typeof rawTeam !== 'string') {
        rawTeam = String(rawTeam);
    }

    return rawTeam.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Fetch Team Points / House Standings from FestFlow API
 */
async function fetchTeamPoints() {
    const endpoint = `${FESTFLOW_BASE_URL}/team-points`;
    try {
        console.log(`[FestFlow API Request] GET ${endpoint} (Header x-api-key: ${FESTFLOW_API_KEY.slice(0, 8)}...)`);
        const response = await fetchWithRetry(endpoint);
        
        if (!response.ok) {
            console.warn(`[FestFlow API Error] GET /team-points HTTP ${response.status} ${response.statusText}`);
            return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
        }

        let apiResponse;
        try {
            apiResponse = await response.json();
            console.log('[FestFlow API Raw Response - /team-points]:\n', JSON.stringify(apiResponse, null, 2));
        } catch (jsonErr) {
            console.warn(`[FestFlow API Error] Non-JSON payload returned from /team-points.`);
            return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
        }

        const dataArray = extractArrayPayload(apiResponse, ['houses', 'teams', 'standings']);
        if (dataArray.length > 0) {
            console.log(`[FestFlow API Live Data] Successfully parsed ${dataArray.length} team standings.`);
            return dataArray.map((item, idx) => ({
                name: extractTeamName(item),
                rank: item.rank || idx + 1,
                points: (item.points !== undefined && item.points !== null) ? item.points : (item.score || 0),
                progress: Math.min(100, Math.round((((item.points || item.score || 1000)) / 1600) * 100)),
                captain: item.captain || 'Team Lead',
                badge: idx === 0 ? 'Current Lead' : (idx === 1 ? 'Runner Up' : ''),
                badgeClass: idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300',
                barGradient: idx === 0 ? 'from-amber-500 to-amber-300' : (idx === 1 ? 'from-emerald-500 to-emerald-300' : 'from-cyan-500 to-cyan-300')
            }));
        }

        console.warn(`[FestFlow API Warning] No items found in /team-points payload.`);
        return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
    } catch (err) {
        const causeStr = err.cause ? `${err.cause.code || err.cause.message} (${err.cause.hostname || ''})` : err.message;
        console.warn(`[FestFlow API Network Error] GET /team-points failed (${causeStr}).`);
        return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
    }
}

/**
 * Fetch Published Competitions from FestFlow API
 */
async function fetchCompetitions() {
    const endpoint = `${FESTFLOW_BASE_URL}/competitions`;
    try {
        console.log(`[FestFlow API Request] GET ${endpoint} (Header x-api-key: ${FESTFLOW_API_KEY.slice(0, 8)}...)`);
        const response = await fetchWithRetry(endpoint);

        if (!response.ok) {
            console.warn(`[FestFlow API Error] GET /competitions HTTP ${response.status} ${response.statusText}`);
            return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
        }

        let apiResponse;
        try {
            apiResponse = await response.json();
            console.log('[FestFlow API Raw Response - /competitions]:\n', JSON.stringify(apiResponse, null, 2));
        } catch (jsonErr) {
            console.warn(`[FestFlow API Error] Non-JSON payload returned from /competitions.`);
            return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
        }

        const compArray = extractArrayPayload(apiResponse, ['competitions', 'items', 'results']);
        if (compArray.length > 0) {
            console.log(`[FestFlow API Live Data] Successfully parsed ${compArray.length} published competition(s).`);

            return compArray.map((comp, idx) => {
                const rawWinners = extractArrayPayload(comp, ['winners', 'results', 'participants', 'ranks']);
                let categoryName = comp.category || comp.categoryName || 'ALPHA ZONE';
                if (categoryName === 'Senior' || categoryName === 'Senior Zone') {
                    categoryName = 'ALPHA ZONE';
                }

                let itemCode = String(comp.code || comp.itemCode || comp.resultNo || comp.resultNumber || (idx + 1));
                if (/^\d+$/.test(itemCode) && itemCode.length < 2) {
                    itemCode = itemCode.padStart(2, '0');
                }

                return {
                    id: comp.id || comp._id || `c_${idx + 1}`,
                    code: itemCode,
                    formattedCode: String(itemCode).padStart(2, '0'),
                    title: comp.title || comp.name || comp.itemName || 'Competition Item',
                    category: categoryName,
                    stage: comp.stage || comp.venue || 'Main Stage',
                    status: comp.status || 'Published',
                    winners: rawWinners.map(w => {
                        console.log(`[FestFlow API Raw Winner Item]:`, JSON.stringify(w, null, 2));

                        const prizeVal = w.prize || w.rank || w.position || w.place || '1st';
                        const chestNoVal = w.chestNo || w.chest_no || w.chestNumber || w.code || w.chest || '-';
                        const pName = w.participant || w.name || w.candidateName || w.studentName || w.candidate || 'Participant';
                        const teamName = extractTeamName(w);

                        let gradeVal = w.grade;
                        if (!gradeVal || gradeVal === '-' || gradeVal === 'none' || gradeVal === 'null' || gradeVal === 'undefined') {
                            gradeVal = '';
                        }

                        const pointsVal = (w.points !== undefined && w.points !== null) ? w.points : (w.mark !== undefined ? w.mark : '-');

                        const rStr = String(prizeVal).toLowerCase();
                        const isFirst = rStr.includes('1st') || rStr === '1' || rStr.includes('first');
                        const isSecond = rStr.includes('2nd') || rStr === '2' || rStr.includes('second');
                        const isThird = rStr.includes('3rd') || rStr === '3' || rStr.includes('third');

                        return {
                            prize: prizeVal,
                            rank: prizeVal,
                            isFirst: isFirst,
                            isSecond: isSecond,
                            isThird: isThird,
                            chestNo: chestNoVal,
                            participant: pName,
                            name: pName,
                            team: teamName,
                            location: '',
                            grade: gradeVal,
                            points: pointsVal
                        };
                    })
                };
            });
        }

        console.warn(`[FestFlow API Warning] Payload received but zero competitions found in /competitions.`);
        return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
    } catch (err) {
        const causeStr = err.cause ? `${err.cause.code || err.cause.message} (${err.cause.hostname || ''})` : err.message;
        console.warn(`[FestFlow API Network Error] GET /competitions failed (${causeStr}). Serving fallback.`);
        return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
    }
}

module.exports = {
    fetchTeamPoints,
    fetchCompetitions,
    FALLBACK_HOUSES,
    FALLBACK_COMPETITIONS
};

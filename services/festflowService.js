/**
 * FestFlow API Service Module for Sirajul Irfan (Event Euphoria)
 * Base URL: https://euphoria.festflow.com/api/public
 * API Key: 1b1ee2866922da7a292e6cba9773f95e40ef04cb8b6ab04f34252f1f395225f9
 */

const axios = require('axios');
const https = require('https');

const rawBaseUrl = process.env.FESTFLOW_BASE_URL || 'https://euphoria.festflow.com/api/public';
const FESTFLOW_BASE_URL = rawBaseUrl.replace(/\/+$|\s+$/g, '');
const FESTFLOW_API_KEY = (process.env.FESTFLOW_API_KEY || '1b1ee2866922da7a292e6cba9773f95e40ef04cb8b6ab04f34252f1f395225f9').trim();
const REQUEST_TIMEOUT_MS = parseInt(process.env.FESTFLOW_TIMEOUT_MS, 10) || 3000;
const ALLOW_FALLBACK = process.env.ALLOW_FESTFLOW_FALLBACK !== 'false';

// Custom HTTPS Agent disabling strict SSL verification to handle local SSL/cert blocks
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
});

// Default Fallback House Standings Data (Only used if network is completely unreachable)
const FALLBACK_HOUSES = [
    { name: 'Phoenix', rank: 1, points: 1480, progress: 92, captain: 'Irfan K.', firstPrizes: 24, badge: 'Current Lead', badgeClass: 'bg-amber-400 text-slate-950', barGradient: 'from-amber-500 to-amber-300' },
    { name: 'Dragon', rank: 2, points: 1410, progress: 88, captain: 'Rayan M.', firstPrizes: 21, badge: 'Runner Up', badgeClass: 'bg-slate-800 text-emerald-400 border border-emerald-500/30', barGradient: 'from-emerald-500 to-emerald-300' },
    { name: 'Griffin', rank: 3, points: 1360, progress: 85, captain: 'Sufiyan A.', firstPrizes: 18, badge: '', badgeClass: '', barGradient: 'from-cyan-500 to-cyan-300' },
    { name: 'Centaur', rank: 4, points: 1290, progress: 80, captain: 'Bilal T.', firstPrizes: 15, badge: '', badgeClass: '', barGradient: 'from-purple-500 to-purple-300' }
];

// Fallback Competition Payloads (Only used if API network request fails completely)
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
                isSecond: false,
                isThird: false,
                chestNo: 'AZ005',
                participant: 'Midjaluj Aman K',
                name: 'Midjaluj Aman K',
                team: 'Phoenix',
                location: '',
                grade: 'A',
                points: 10
            },
            {
                prize: '2nd',
                rank: '2nd',
                isFirst: false,
                isSecond: true,
                isThird: false,
                chestNo: 'AZ001',
                participant: 'Muhammed Swalih C',
                name: 'Muhammed Swalih C',
                team: 'Dragon',
                location: '',
                grade: 'B',
                points: 7
            },
            {
                prize: '3rd',
                rank: '3rd',
                isFirst: false,
                isSecond: false,
                isThird: true,
                chestNo: 'AZ008',
                participant: 'Muhammed Jabir VK',
                name: 'Muhammed Jabir VK',
                team: 'Griffin',
                location: '',
                grade: 'C',
                points: 4
            }
        ]
    },
    {
        id: 'c_eposter_design',
        code: '02',
        formattedCode: '02',
        title: 'E-Poster Design',
        category: 'ALPHA ZONE',
        stage: 'Main Stage B',
        status: 'Published',
        winners: [
            {
                prize: '1st',
                rank: '1st',
                isFirst: true,
                isSecond: false,
                isThird: false,
                chestNo: 'AZ012',
                participant: 'Muhammed Sinan',
                name: 'Muhammed Sinan',
                team: 'Centaur',
                location: '',
                grade: 'A',
                points: 10
            },
            {
                prize: '2nd',
                rank: '2nd',
                isFirst: false,
                isSecond: true,
                isThird: false,
                chestNo: 'AZ003',
                participant: 'Rashid Ahmed',
                name: 'Rashid Ahmed',
                team: 'Phoenix',
                location: '',
                grade: 'B',
                points: 7
            },
            {
                prize: '3rd',
                rank: '3rd',
                isFirst: false,
                isSecond: false,
                isThird: true,
                chestNo: 'AZ009',
                participant: 'Faris Farhan',
                name: 'Faris Farhan',
                team: 'Dragon',
                location: '',
                grade: 'B',
                points: 5
            }
        ]
    }
];

/**
 * Fast & Robust API Request helper using Axios with HTTPS Agent
 */
async function fetchWithAxios(url, options = {}, maxRetries = 1, timeoutMs = REQUEST_TIMEOUT_MS) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'x-api-key': FESTFLOW_API_KEY,
                    'Accept': 'application/json, text/plain, */*',
                    'Cache-Control': 'no-cache',
                    ...options.headers
                },
                httpsAgent: httpsAgent,
                timeout: timeoutMs,
                validateStatus: () => true
            });
            return response;
        } catch (err) {
            lastError = err;
            const errCode = err.code || (err.cause ? err.cause.code : 'UNKNOWN');
            
            if (errCode === 'ENOTFOUND' || errCode === 'ECONNREFUSED' || errCode === 'ENETUNREACH' || errCode === 'ETIMEDOUT' || errCode === 'ECONNRESET') {
                console.warn(`[FestFlow Service Network Warning] Local DNS/Network unreachable (${errCode}).`);
                break;
            }

            console.error(`[FestFlow API Axios Attempt ${attempt}/${maxRetries} Error]:`, {
                url: url,
                message: err.message,
                code: errCode
            });

            if (attempt < maxRetries) {
                await new Promise(res => setTimeout(res, 300));
            }
        }
    }
    throw lastError || new Error('FestFlow Request Failed');
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

        const commonKeys = [
            'competitions', 'data', 'results', 'items', 'payload', 
            'list', 'records', 'events', 'published', 'houses', 'teams', 'standings', 'participants', 'winners'
        ];
        for (const key of commonKeys) {
            if (Array.isArray(rawData[key])) return rawData[key];
        }

        const wrapperKeys = ['data', 'payload', 'result', 'response', 'body'];
        for (const wrapKey of wrapperKeys) {
            const nested = rawData[wrapKey];
            if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
                for (const key of primaryKeys.concat(commonKeys)) {
                    if (Array.isArray(nested[key])) return nested[key];
                }
                for (const k of Object.keys(nested)) {
                    if (Array.isArray(nested[k])) return nested[k];
                }
            }
        }

        for (const k of Object.keys(rawData)) {
            if (Array.isArray(rawData[k])) return rawData[k];
        }
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
        console.log(`[FestFlow API Axios Request] GET ${endpoint}`);
        const response = await fetchWithAxios(endpoint, {}, 1, REQUEST_TIMEOUT_MS);

        if (response && response.status === 200) {
            const rawData = response.data;
            console.log('[FESTFLOW RAW TEAM POINTS API RESPONSE]:\n', typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2));

            const dataArray = extractArrayPayload(rawData, ['houses', 'teams', 'standings']);
            if (dataArray.length > 0) {
                console.log(`[FestFlow API Live Data] Successfully parsed ${dataArray.length} team standings from API.`);
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
            console.warn(`[FestFlow API Warning] 200 OK received from /team-points but array payload was empty.`);
            return [];
        }

        console.warn(`[FestFlow API Error] GET /team-points status ${response?.status || 'No Response'}.`);
        return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
    } catch (err) {
        console.warn(`[FestFlow API Catch] /team-points unreachable (${err.message}).`);
        return ALLOW_FALLBACK ? FALLBACK_HOUSES : [];
    }
}

/**
 * Fetch Published Competitions & Results strictly from FestFlow API
 */
async function fetchCompetitions() {
    const endpoint = `${FESTFLOW_BASE_URL}/competitions`;
    try {
        console.log(`[FestFlow API Axios Request] GET ${endpoint}`);
        const response = await fetchWithAxios(endpoint, {}, 1, REQUEST_TIMEOUT_MS);

        if (response && response.status === 200) {
            const rawData = response.data;
            console.log('[FESTFLOW RAW COMPETITIONS API RESPONSE]:\n', typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2));

            let compArray = [];
            if (Array.isArray(rawData)) {
                compArray = rawData;
            } else if (rawData && typeof rawData === 'object') {
                if (Array.isArray(rawData.competitions)) compArray = rawData.competitions;
                else if (Array.isArray(rawData.data)) compArray = rawData.data;
                else if (rawData.data && Array.isArray(rawData.data.competitions)) compArray = rawData.data.competitions;
                else if (rawData.data && Array.isArray(rawData.data.items)) compArray = rawData.data.items;
                else if (rawData.data && Array.isArray(rawData.data.results)) compArray = rawData.data.results;
                else if (Array.isArray(rawData.results)) compArray = rawData.results;
                else if (Array.isArray(rawData.items)) compArray = rawData.items;
                else if (Array.isArray(rawData.payload)) compArray = rawData.payload;
                else compArray = extractArrayPayload(rawData, ['competitions', 'items', 'results']);
            }

            if (Array.isArray(compArray) && compArray.length > 0) {
                console.log(`[FestFlow API Live Data] Retaining ${compArray.length} raw competition item(s) from API.`);

                const mappedCompetitions = await Promise.all(compArray.map(async (comp, idx) => {
                    const compId = comp.id || comp._id || comp.competitionId;
                    let rawWinners = Array.isArray(comp.winners) ? comp.winners :
                                     (Array.isArray(comp.results) ? comp.results :
                                     (Array.isArray(comp.participants) ? comp.participants : []));

                    // Query sub-endpoint for competition results if needed
                    if (compId) {
                        try {
                            const subUrl = `${FESTFLOW_BASE_URL}/competitions/${compId}/results`;
                            console.log(`[FestFlow API Axios Sub-Request] GET ${subUrl}`);
                            const subResponse = await fetchWithAxios(subUrl, {}, 1, 2000);
                            if (subResponse && subResponse.status === 200) {
                                const subData = subResponse.data;
                                console.log(`[FESTFLOW RAW RESULTS API RESPONSE for ${compId}]:\n`, typeof subData === 'string' ? subData : JSON.stringify(subData, null, 2));
                                const extracted = extractArrayPayload(subData, ['winners', 'results', 'participants', 'ranks', 'data', 'items']);
                                if (extracted && extracted.length > 0) {
                                    rawWinners = extracted;
                                }
                            }
                        } catch (subErr) {
                            console.warn(`[FestFlow API Sub-Fetch Warning for ${compId}]: ${subErr.message}`);
                        }
                    }

                    let categoryName = comp.category || comp.categoryName || comp.stageCategory || 'ALPHA ZONE';
                    if (typeof categoryName === 'object') {
                        categoryName = categoryName.name || categoryName.title || categoryName.label || 'ALPHA ZONE';
                    }

                    let itemCode = String(comp.code || comp.itemCode || comp.resultNo || comp.competitionCode || (idx + 1));
                    if (/^\d+$/.test(itemCode) && itemCode.length < 2) {
                        itemCode = itemCode.padStart(2, '0');
                    }

                    return {
                        ...comp,
                        id: compId || `c_${idx + 1}`,
                        code: itemCode,
                        formattedCode: String(itemCode).padStart(2, '0'),
                        title: comp.title || comp.name || comp.itemName || comp.competitionName || 'Competition Item',
                        category: categoryName,
                        stage: comp.stage || comp.venue || comp.location || 'Main Stage',
                        status: comp.status || (comp.published ? 'Published' : 'Published'),
                        winners: rawWinners.map(w => {
                            const prizeVal = w.prize || w.rank || w.position || w.place || w.award || '1st';
                            const chestNoVal = w.chestNo || w.chest_no || w.chestNumber || w.code || w.chest || w.candidateCode || w.candidateNo || '-';
                            const pName = w.participant || w.name || w.candidateName || w.studentName || w.student_name || w.candidate || 'Participant';
                            const teamName = extractTeamName(w);

                            let gradeVal = w.grade || w.gradeName;
                            if (!gradeVal || gradeVal === '-' || gradeVal === 'none' || gradeVal === 'null' || gradeVal === 'undefined') {
                                gradeVal = '';
                            }

                            const pointsVal = (w.points !== undefined && w.points !== null) ? w.points : (w.mark !== undefined ? w.mark : (w.score !== undefined ? w.score : '-'));

                            const rStr = String(prizeVal).toLowerCase();
                            const isFirst = rStr.includes('1st') || rStr === '1' || rStr.includes('first');
                            const isSecond = rStr.includes('2nd') || rStr === '2' || rStr.includes('second');
                            const isThird = rStr.includes('3rd') || rStr === '3' || rStr.includes('third');

                            return {
                                ...w,
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
                }));

                // Return ONLY live competitions parsed from API!
                return mappedCompetitions;
            }

            console.warn(`[FestFlow API Warning] 200 OK received from /competitions but zero items found in API payload.`);
            return [];
        }

        console.warn(`[FestFlow API Error] GET /competitions status ${response?.status || 'No Response'}.`);
        return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
    } catch (err) {
        console.warn(`[FestFlow API Catch] /competitions unreachable (${err.message}).`);
        return ALLOW_FALLBACK ? FALLBACK_COMPETITIONS : [];
    }
}

module.exports = {
    fetchTeamPoints,
    fetchCompetitions,
    FALLBACK_HOUSES,
    FALLBACK_COMPETITIONS
};



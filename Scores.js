// Vercel Serverless Function: proxy for football-data.org API
// Solves CORS issues by calling the API server-side
// Required env var: FOOTBALL_DATA_TOKEN (set in Vercel dashboard)

export default async function handler(req, res) {
    // Allow CORS for own origin (and dev)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    const { competition = "PL", limit = "10" } = req.query;
    const token = process.env.FOOTBALL_DATA_TOKEN;

    if (!token) {
        res.status(500).json({ error: "FOOTBALL_DATA_TOKEN environment variable is not set in Vercel" });
        return;
    }

    // Whitelist allowed competitions to prevent abuse
    const validCompetitions = ["PL", "PD", "SA", "BL1", "FL1", "CL", "EC", "WC"];
    if (!validCompetitions.includes(competition)) {
        res.status(400).json({ error: "Invalid competition code" });
        return;
    }

    try {
        const url = `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=${limit}`;
        const response = await fetch(url, {
            headers: { "X-Auth-Token": token },
        });

        if (!response.ok) {
            res.status(response.status).json({
                error: `football-data.org returned ${response.status}`,
                detail: await response.text().catch(() => null),
            });
            return;
        }

        const data = await response.json();

        // Cache for 5 minutes at edge, allow stale for 10 min while revalidating
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

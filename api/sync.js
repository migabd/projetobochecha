export default async function handler(req, res) {
    // Vercel KV ou Upstash Marketplace
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return res.status(500).json({ error: 'Banco de dados Redis nǜo estǭ configurado na Vercel.' });
    }

    const dbKey = 'caderno_db_main';

    try {
        if (req.method === 'GET') {
            const response = await fetch(`${url}/get/${dbKey}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.result !== null && data.result !== undefined) {
                let parsed = data.result;
                // Parse recursive para lidar com double ou triple stringify
                while (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch(e) {
                        break;
                    }
                }
                return res.status(200).json(parsed);
            }
            return res.status(200).json(null); // Banco vazio
        } 
        
        if (req.method === 'POST') {
            // Em Upstash, se mandarmos como JSON string no body, ele salva a string.
            const response = await fetch(`${url}/set/${dbKey}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            return res.status(200).json({ success: true, response: data });
        }

        return res.status(405).json({ error: 'MǸtodo nǜo permitido.' });

    } catch (error) {
        console.error('Erro na API Sync KV:', error);
        return res.status(500).json({ error: 'Erro interno no servidor de banco de dados.' });
    }
}

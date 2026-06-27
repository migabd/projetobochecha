export default async function handler(req, res) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return res.status(500).json({ error: 'Banco de dados Redis não está configurado na Vercel.' });
    }

    const dbKey = 'caderno_db_main';

    try {
        if (req.method === 'GET') {
            const response = await fetch(`${url}/get/${dbKey}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.result !== null && data.result !== undefined) {
                return res.status(200).json(data.result);
            }
            return res.status(200).json(null);
        } 
        
        if (req.method === 'POST') {
            const response = await fetch(`${url}/set/${dbKey}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            
            const data = await response.json();
            if (data.error) {
                console.error("Upstash Error:", data.error);
                return res.status(500).json({ error: data.error });
            }
            return res.status(200).json({ success: true, response: data });
        }
        
        if (req.method === 'DELETE') {
            const response = await fetch(`${url}/del/${dbKey}`, {
                method: 'POST', // Upstash REST API uses POST for /del
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (data.error) {
                return res.status(500).json({ error: data.error });
            }
            return res.status(200).json({ success: true, response: data });
        }

        return res.status(405).json({ error: 'Método não permitido.' });
    } catch (error) {
        console.error('Erro na API Sync KV:', error);
        return res.status(500).json({ error: 'Erro interno no servidor de banco de dados: ' + error.message });
    }
}

export default async function handler(req, res) {
    // Vercel KV ou Upstash Marketplace
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    const expectedSecret = process.env.API_SECRET;

    if (!url || !token) {
        return res.status(500).json({ error: 'Banco de dados Redis não está configurado na Vercel.' });
    }

    // Verifica a senha se ela foi configurada no servidor
    const authHeader = req.headers.authorization;
    if (expectedSecret) {
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
            return res.status(401).json({ error: 'Senha incorreta (API Secret) ou não fornecida.' });
        }
    }

    // Usaremos uma chave fixa para armazenar os dados do usuário neste app
    const dbKey = 'caderno_db_main';

    try {
        if (req.method === 'GET') {
            const response = await fetch(`${url}/get/${dbKey}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.result) {
                let parsed = data.result;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch(e) {}
                }
                return res.status(200).json(parsed);
            }
            return res.status(200).json(null); // Banco vazio
        } 
        
        if (req.method === 'POST') {
            const response = await fetch(`${url}/set/${dbKey}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(JSON.stringify(req.body)) 
            });
            const data = await response.json();
            return res.status(200).json({ success: true, response: data });
        }

        return res.status(405).json({ error: 'Método não permitido.' });

    } catch (error) {
        console.error('Erro na API Sync KV:', error);
        return res.status(500).json({ error: 'Erro interno no servidor de banco de dados.' });
    }
}

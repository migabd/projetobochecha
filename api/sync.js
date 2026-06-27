export default async function handler(req, res) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return res.status(500).json({ error: 'Banco de dados Redis não está configurado na Vercel.' });
    }

    const dbKey = 'caderno_db_main';

    try {
        if (req.method === 'GET') {
            const chunkIndex = req.query.chunk;
            if (chunkIndex !== undefined) {
                const response = await fetch(`${url}/get/${dbKey}_chunk_${chunkIndex}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                return res.status(200).json({ data: data.result || '' });
            }
            
            const response = await fetch(`${url}/get/${dbKey}_meta`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.result !== null && data.result !== undefined) {
                return res.status(200).json(data.result);
            }
            
            const oldRes = await fetch(`${url}/get/${dbKey}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const oldData = await oldRes.json();
            if (oldData.result !== null && oldData.result !== undefined) {
                return res.status(200).json({ legacy: true, data: oldData.result });
            }
            
            return res.status(200).json(null);
        } 
        
        if (req.method === 'POST') {
            const body = req.body;
            
            if (body.action === 'chunk') {
                const response = await fetch(`${url}/set/${dbKey}_chunk_${body.index}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body.data)
                });
                const data = await response.json();
                if (data.error) return res.status(500).json({ error: data.error });
                return res.status(200).json({ success: true });
            }
            
            if (body.action === 'commit') {
                // Delete orphaned chunks (e.g., if new save has 5 chunks and old had 10, delete 5 to 9)
                // We don't know exactly how many old chunks there were, so we just attempt to delete up to 20 chunks ahead
                for (let i = body.count; i < body.count + 20; i++) {
                    await fetch(`${url}/del/${dbKey}_chunk_${i}`, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }

                const response = await fetch(`${url}/set/${dbKey}_meta`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chunks: body.count })
                });
                const data = await response.json();
                if (data.error) return res.status(500).json({ error: data.error });
                return res.status(200).json({ success: true });
            }
            
            const response = await fetch(`${url}/set/${dbKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            if (data.error) return res.status(500).json({ error: data.error });
            return res.status(200).json({ success: true });
        }
        
        if (req.method === 'DELETE') {
            await fetch(`${url}/del/${dbKey}_meta`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetch(`${url}/del/${dbKey}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });
            // Delete all possible chunks up to 100 (which would be 200MB, a safe upper limit)
            for (let i = 0; i < 100; i++) {
                await fetch(`${url}/del/${dbKey}_chunk_${i}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Método não permitido.' });
    } catch (error) {
        console.error('Erro na API Sync KV:', error);
        return res.status(500).json({ error: 'Erro interno no servidor de banco de dados: ' + error.message });
    }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

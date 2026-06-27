import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export default async function handler(req, res) {
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
                
                if (typeof parsed === 'string') {
                    // Try decompression first (Base64 gzipped string)
                    if (!parsed.trim().startsWith('{') && !parsed.trim().startsWith('[')) {
                        try {
                            const buffer = Buffer.from(parsed, 'base64');
                            const decompressed = await gunzip(buffer);
                            const decompressedStr = decompressed.toString('utf-8');
                            parsed = JSON.parse(decompressedStr);
                            return res.status(200).json(parsed);
                        } catch(e) {
                            console.error('Falha ao descomprimir (talvez seja texto puro):', e.message);
                        }
                    }
                    
                    // Fallback para double stringify antigo sem compressão
                    while (typeof parsed === 'string') {
                        try {
                            parsed = JSON.parse(parsed);
                        } catch(e) {
                            break;
                        }
                    }
                }
                return res.status(200).json(parsed);
            }
            return res.status(200).json(null); // Banco vazio
        } 
        
        if (req.method === 'POST') {
            // Comprime o payload JSON com gzip para burlar limite de 1MB do Upstash Free
            const jsonString = JSON.stringify(req.body);
            const compressedBuffer = await gzip(jsonString);
            const base64Data = compressedBuffer.toString('base64');
            
            const response = await fetch(`${url}/set/${dbKey}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(base64Data)
            });
            
            const data = await response.json();
            
            // Se o Upstash retornar erro (ex: payload ainda > 1MB mesmo comprimido), precisamos avisar o frontend!
            if (data.error) {
                console.error("Upstash Error:", data.error);
                return res.status(500).json({ error: data.error });
            }
            
            return res.status(200).json({ success: true, response: data });
        }

        return res.status(405).json({ error: 'MǸtodo nǜo permitido.' });

    } catch (error) {
        console.error('Erro na API Sync KV:', error);
        return res.status(500).json({ error: 'Erro interno no servidor de banco de dados: ' + error.message });
    }
}

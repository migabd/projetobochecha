
import base64

def xor_encrypt(text, key):
    res = []
    for i in range(len(text)):
        res.append(chr(ord(text[i]) ^ ord(key[i % len(key)])))
    return base64.b64encode("".join(res).encode('latin-1')).decode('utf-8')

# Como usar:
# 1. Coloque seus dados reais abaixo (APENAS LOCALMENTE)
# 2. Rode o script: python calc_xor.py
# 3. Copie o resultado para o seu App.jsx
# 4. REMOVA os dados reais antes de fazer commit

key = "Gabriel"
token = "SEU_TOKEN_AQUI"
gist = "SEU_GIST_ID_AQUI"
gemini = "SUA_CHAVE_GEMINI_AQUI"

print(f"Token: {xor_encrypt(token, key)}")
print(f"Gist: {xor_encrypt(gist, key)}")
print(f"Gemini: {xor_encrypt(gemini, key)}")

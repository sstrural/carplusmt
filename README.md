# 🌿 CAR-MT Analisador

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sema-mt/car-mt-analisador)

Sistema para processar memoriais descritivos de imóveis rurais e gerar relatórios para o SIMCAR-MT com IA.

## 🚀 Demo Online

**Link:** [car-mt-analisador.vercel.app](https://car-mt-analisador.vercel.app)

## ⚡ Deploy Rápido

### 1. Fork & Deploy no Vercel
1. Faça fork deste repositório
2. Conecte com sua conta Vercel
3. Deploy automático em segundos
4. Compartilhe o link gerado

### 2. Deploy Manual
```bash
git clone https://github.com/sema-mt/car-mt-analisador
cd car-mt-analisador
npx vercel
```

## ⚙️ Como Usar

### Para usuários finais:
1. **Acesse o sistema** no link do Vercel
2. **Configure sua API key gratuita**:
   - Modal aparece automaticamente
   - Acesse: https://console.groq.com/keys
   - Crie conta gratuita e gere uma key
   - Cole no sistema
3. **Use normalmente**: Importe PDF → Revise dados → Gere relatório

### Para desenvolvedores:
```bash
# Desenvolvimento local
python -m http.server 8000
# ou
npx serve .
```

## 🔒 Segurança & Privacidade

- ✅ **Zero configuração**: Nenhuma API key no código
- ✅ **Armazenamento local**: Keys ficam no navegador do usuário
- ✅ **Código aberto**: 100% auditável
- ✅ **HTTPS**: Deploy seguro no Vercel
- ✅ **Headers de segurança**: Configurados automaticamente

## 🛠️ Stack Técnica

- **Frontend**: HTML5 + Vanilla JavaScript
- **IA**: Groq API (Llama 3.3 70B)
- **PDF**: PDF.js (processamento no navegador)
- **Deploy**: Vercel (serverless)
- **Domínio**: Vercel ou domínio customizado

## 📋 Funcionalidades

### Processamento de Documentos:
- ✅ **PDF nativo** (com OCR embutido)
- ✅ **DOCX/DOC** (Microsoft Word)
- ✅ **TXT** (texto simples)

### Inteligência Artificial:
- ✅ **Extração automática** de dados do memorial
- ✅ **Identificação de coordenadas** UTM
- ✅ **Validação completa** para SIMCAR
- ✅ **Geração de relatórios** detalhados

### Georreferenciamento:
- ✅ **Datum SIRGAS2000** (Fusos 21S e 22S)
- ✅ **Conversão UTM → Lat/Lon**
- ✅ **Geração de arquivos KML**
- ✅ **Cálculo de extremos** para SIMCAR

### Específico para MT:
- ✅ **Módulos fiscais** de Mato Grosso
- ✅ **Validação SEMA-MT**
- ✅ **Checklist SIMCAR**
- ✅ **Formulários padronizados**

## 🌐 URLs e Links

- **Demo**: https://car-mt-analisador.vercel.app
- **Repositório**: https://github.com/sema-mt/car-mt-analisador
- **Issues**: https://github.com/sema-mt/car-mt-analisador/issues
- **API Groq**: https://console.groq.com
- **SIMCAR-MT**: https://simcar.sema.mt.gov.br

## 📱 Compatibilidade

- ✅ **Chrome/Edge** (recomendado)
- ✅ **Firefox**
- ✅ **Safari** 
- ✅ **Mobile** (responsivo)
- ✅ **Offline** (após carregar)

## 🤝 Contribuir

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🏛️ Governo do Estado de Mato Grosso

Desenvolvido para a **Secretaria de Estado de Meio Ambiente (SEMA-MT)** - Sistema SIMCAR.

---

**⚡ Powered by [Vercel](https://vercel.com) | 🤖 AI by [Groq](https://groq.com)**

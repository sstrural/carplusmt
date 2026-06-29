# 🚀 CAR-MT Pro - Roadmap de Desenvolvimento

## 🎯 Visão do Produto
Transformar o CAR-MT Analisador de uma ferramenta simples em uma **plataforma SaaS insubstituível** para técnicos, engenheiros e prefeituras do MT.

## 📊 Análise de Mercado

### Problemas dos Sistemas Atuais:
- ❌ SIGEF, SIMCAR, CAR Federal = formulários burocráticos
- ❌ Não leem memoriais automaticamente
- ❌ Não validam tecnicamente antes do envio
- ❌ Não orientam o técnico
- ❌ Descoberta de erros só após rejeição (semanas depois)

### Nossa Solução Atual:
- ✅ Lê memorial e preenche sozinho
- ✅ Valida dados antes do envio
- ✅ Orienta passo a passo
- ✅ Interface profissional

## 🎯 Features Que Tornarão Insubstituível

### 🔴 Prioridade ALTA (MVP+)

#### 1. Validador Geométrico do Perímetro
**Problema**: Técnico descobre inconsistência só quando SIGEF rejeita (semanas depois)
**Solução**: 
- Calcular se polígono fecha geometricamente
- Verificar se área declarada = área calculada pelos vértices
- Detectar sobreposição de segmentos
- Validar precisão de coordenadas UTM
- Alertas visuais em tempo real

**Impacto**: ⭐⭐⭐⭐⭐ Elimina 80% das rejeições do SIGEF
**Esforço**: 🔧🔧🔧 Médio (algoritmos geométricos)

#### 2. Detector de APP e Calculadora de RL
**Problema**: Nenhuma ferramenta faz isso offline para técnico de campo
**Solução**:
- Base local de hidrografia MT (rios, nascentes)
- Cálculo de APP automático (30m, 50m, 100m conforme largura)
- Cálculo de RL mínima (80% Amazônia, 35% Cerrado MT)
- Mapa visual com sobreposições
- Estimativa de área a recuperar

**Impacto**: ⭐⭐⭐⭐⭐ Core do CAR, diferencial brutal
**Esforço**: 🔧🔧🔧🔧🔧 Alto (dados geoespaciais, algoritmos)

### 🟡 Prioridade MÉDIA (Diferenciação)

#### 3. Relatório de Pendências para Produtor
**Problema**: Técnico faz relatório manualmente no Word
**Solução**:
- Template PDF automatizado
- Linguagem não-técnica
- Lista de documentos faltantes
- Explicação de irregularidades
- Orientações de regularização
- Branding do escritório técnico

**Impacto**: ⭐⭐⭐⭐ Diferencia serviço do técnico
**Esforço**: 🔧🔧 Baixo (templates + dados)

#### 4. Histórico Local de CAR por CPF/Imóvel
**Problema**: Escritórios perdem controle de dezenas de CAR mensais
**Solução**:
- Banco local SQLite
- Busca por CPF, matrícula, nome
- Status de cada CAR (pendente, enviado, aprovado)
- Arquivos anexados (memorial, KML, relatórios)
- Timeline de ações
- Backup/sync em nuvem

**Impacto**: ⭐⭐⭐ Fideliza técnico ao sistema
**Esforço**: 🔧🔧🔧 Médio (banco local + UI)

#### 5. Checklist de Passivo Ambiental
**Problema**: Técnico não calcula passivo para crédito rural
**Solução**:
- Cálculo automático de déficit de APP/RL
- Estimativa de área a recuperar
- Valor estimado de recuperação
- Relatório para financiamento (Pronaf, Pronamp)
- Integração com tabelas INCRA/CNA

**Impacto**: ⭐⭐⭐⭐ Essencial para crédito rural
**Esforço**: 🔧🔧🔧 Médio (cálculos + dados econômicos)

### 🟢 Prioridade BAIXA (Polimento)

#### 6. PWA Offline para Campo
**Problema**: Fazendas sem internet, técnico trabalha offline
**Solução**:
- Progressive Web App instalável
- Funcionamento 100% offline
- Sincronização quando conectar
- Cache de dados geoespaciais
- Modo mobile otimizado

**Impacto**: ⭐⭐⭐⭐ Essencial para MT rural
**Esforço**: 🔧🔧🔧 Médio (service workers + cache)

#### 7. Integração SNCR/INCRA
**Problema**: Área declarada vs. registrada gera inconsistência
**Solução**:
- API do SNCR para consulta por matrícula
- Validação automática de área
- Alert de divergências
- Sugestão de correção

**Impacto**: ⭐⭐⭐ Evita rejeições por área
**Esforço**: 🔧🔧🔧🔧 Alto (burocracia de API gov)

#### 8. Assinatura Digital Gov.br
**Problema**: Relatórios sem valor jurídico
**Solução**:
- Integração com Login Único
- Assinatura com certificado do técnico
- Validade jurídica do documento
- Compliance com legislação

**Impacto**: ⭐⭐⭐⭐ Agrega valor jurídico
**Esforço**: 🔧🔧🔧🔧🔧 Alto (integração gov + certificados)

## 📈 Modelo de Negócios SaaS

### 🎯 Públicos-Alvo

#### B2B1: Técnicos/Engenheiros Agrônomos
- **Perfil**: Escritórios que fazem 5-50 CAR/mês
- **Dor**: Rejeições, retrabalho, relatórios manuais
- **Valor**: Economia de tempo + redução de erro + diferenciação do serviço

#### B2B2: Prefeituras e Secretarias MT
- **Perfil**: Órgãos que analisam centenas de CAR/mês
- **Dor**: Volume alto, análise manual, falta de padronização
- **Valor**: Agilidade na análise + conformidade + relatórios automatizados

### 💰 Estrutura de Preços

#### Plano Técnico Individual
- **R$ 297/mês** - até 20 CAR processados
- Todas as validações automáticas
- Relatórios PDF personalizados
- Histórico local ilimitado
- Suporte por chat

#### Plano Escritório
- **R$ 697/mês** - até 100 CAR processados
- Múltiplos usuários (até 5)
- Branding personalizado nos relatórios
- Backup em nuvem
- Dashboard gerencial
- Suporte prioritário

#### Plano Institucional
- **R$ 1.997/mês** - CAR ilimitados
- White-label completo
- Integração com sistemas próprios
- Usuários ilimitados
- SLA 99.9%
- Gerente de conta dedicado

### 📊 Projeção Financeira (12 meses)

**Cenário Conservador MT:**
- 50 técnicos × R$ 297 = R$ 14.850/mês
- 10 escritórios × R$ 697 = R$ 6.970/mês
- 3 prefeituras × R$ 1.997 = R$ 5.991/mês
- **Total: R$ 27.811/mês = R$ 333.732/ano**

**Cenário Otimista (expansão Centro-Oeste):**
- 200 técnicos × R$ 297 = R$ 59.400/mês
- 40 escritórios × R$ 697 = R$ 27.880/mês
- 12 prefeituras × R$ 1.997 = R$ 23.964/mês
- **Total: R$ 111.244/mês = R$ 1.334.928/ano**

## 🛣️ Cronograma de Desenvolvimento

### Fase 1: MVP+ Geométrico (2 meses)
**Objetivo**: Eliminar rejeições SIGEF
- [x] Sistema atual funcionando
- [ ] Validador geométrico de polígonos
- [ ] Cálculo de área por coordenadas
- [ ] Detector de sobreposições
- [ ] Interface de validação visual
- [ ] Testes com 10 técnicos piloto

### Fase 2: APP/RL Engine (3 meses)
**Objetivo**: Core diferenciador do mercado
- [ ] Base de dados hidrográfica MT
- [ ] Algoritmos de cálculo de APP
- [ ] Engine de Reserva Legal
- [ ] Mapa interativo de sobreposições
- [ ] Relatórios de passivo ambiental
- [ ] Beta com 25 usuários pagos

### Fase 3: Plataforma SaaS (2 meses)
**Objetivo**: Modelo de negócio escalável
- [ ] Sistema de autenticação/planos
- [ ] Histórico e banco de dados
- [ ] Relatórios PDF automatizados
- [ ] Dashboard gerencial
- [ ] Sistema de cobrança
- [ ] Lançamento comercial

### Fase 4: Expansão (3 meses)
**Objetivo**: Consolidação e crescimento
- [ ] PWA offline
- [ ] Integração SNCR
- [ ] Assinatura digital Gov.br
- [ ] White-label institucional
- [ ] Expansão para GO, MS, RO
- [ ] 500+ usuários ativos

## 🎯 Próximos Passos Imediatos

1. **Validar com mercado**: Apresentar roadmap para 5 técnicos MT
2. **Desenvolver Fase 1**: Validador geométrico (próximos 60 dias)
3. **Testar cobrança**: Freemium → Premium a R$ 97/mês
4. **Construir waitlist**: Landing page com pré-cadastro
5. **Buscar investimento**: Seed de R$ 500K para 18 meses

---

**O timing está perfeito. O mercado está maduro, a tecnologia permite, e você já tem a solução base funcionando. Hora de escalar!** 🚀
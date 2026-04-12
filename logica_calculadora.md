# Documentação Técnica: Lógica da Calculadora de Transformação (Projeto 8 EM 12)

Este documento detalha a inteligência por trás da calculadora de transformação corporal integrada à landing page. A lógica foi desenvolvida para fornecer estimativas realistas e personalizadas baseadas no perfil individual do usuário para um período de 12 semanas.

---

## 1. Visão Geral
A calculadora utiliza cinco variáveis principais para determinar o potencial de transformação de cada usuário:
1. **Sexo** (Impacto hormonal e metabólico)
2. **Objetivo** (Foco do protocolo: Definição, Massa Muscular ou Recomposição)
3. **Nível de Experiência** (Potencial de adaptação neuromuscular)
4. **Idade** (Taxa metabólica e eficiência regenerativa)
5. **Peso e Altura** (Fatores de validação de biotipo)

---

## 2. Lógica de Perda de Gordura (kg)

O cálculo da estimativa de perda de gordura segue a fórmula:
**Perda Final = Valor Base × Multiplicador de Nível × Multiplicador de Idade × Multiplicador de Sexo**

### A. Valores Base por Objetivo
- **Definição:** 7,0 kg
- **Ganho de Massa:** 2,0 kg
- **Ambos (Recomposição):** 4,5 kg

### B. Multiplicadores
| Variável | Categoria | Multiplicador |
| :--- | :--- | :--- |
| **Nível** | Iniciante | 1.25x (Maior potencial de queima) |
| | Intermediário | 1.00x |
| | Avançado | 0.80x (Corpo já adaptado) |
| **Idade** | Até 25 anos | 1.05x |
| | 26 a 35 anos | 1.00x |
| | 36 a 45 anos | 0.92x |
| | Acima de 45 anos | 0.85x |
| **Sexo** | Masculino | 1.08x |
| | Feminino | 1.00x |

**Limite de Segurança:** O sistema limita a perda máxima exibida em **10kg** em 12 semanas para manter a promessa dentro de margens saudáveis e realistas.

---

## 3. Lógica de Ganho de Massa Muscular (kg)

O cálculo da estimativa de hipertrofia segue a fórmula:
**Ganho Final = Valor Base (por nível) × Multiplicador de Sexo × Multiplicador de Objetivo**

### A. Valores Base por Nível de Experiência
- **Iniciante:** 2,5 kg
- **Intermediário:** 1,5 kg
- **Avançado:** 0,8 kg

### B. Multiplicadores
| Variável | Categoria | Multiplicador |
| :--- | :--- | :--- |
| **Sexo** | Masculino | 1.15x |
| | Feminino | 1.00x |
| **Objetivo** | Definição | 0.60x |
| | Ganho de Massa | 1.40x |
| | Ambos | 1.00x |

---

## 4. Regras de Validação e Experiência do Usuário (UX)

Para garantir a integridade dos dados e o profissionalismo da ferramenta:
- **Idade Mínima:** 15 anos.
- **Peso Mínimo:** 40 kg.
- **Campos Obrigatórios:** Altura deve estar preenchida.
- **Feedback Visual:** Caso os critérios não sejam atendidos, a calculadora exibe um estado neutro ("—") em vez de valores incorretos.

---

## 5. Exemplo de Caso Real
**Usuário:** Homem, 28 anos, Iniciante, focado em "Ganho de Massa".
- **Cálculo de Gordura:** 2,0 (base) × 1,25 (iniciante) × 1,00 (idade) × 1,08 (sexo) = **2,7 kg perdidos.**
- **Cálculo de Massa:** 2,5 (base iniciante) × 1,15 (sexo) × 1,40 (obj) = **4,0 kg ganhos.**

---

Este modelo matemático garante que o cliente receba uma estimativa personalizada, aumentando a percepção de valor e a taxa de conversão no WhatsApp.

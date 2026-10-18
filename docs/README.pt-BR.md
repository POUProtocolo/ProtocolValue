# ProtocolValue — Documentação em português (Brasil)

Site oficial: https://protocolvalue.com/?lang=pt

## Propósito

O ProtocolValue é uma plataforma independente para consulta de valores internos definidos por mecanismos de contratos inteligentes. **Valor interno não é sinônimo de preço de mercado, liquidez ou garantia de resgate.**

## Critérios de publicação

Uma entrada só é elegível quando existe prova pública e reproduzível on-chain de seu preço ou valor interno. A prova deve identificar a rede, contratos e implementações de proxies quando aplicável, método/seletor, bloco e hash, retorno bruto, unidades/decimais e fórmula ou regra reproduzível. Código, documentação teórica ou JSON isolados não substituem a prova.

Protocolos com estado `EOL`, `DEPRECATED` ou `SUNSET_ISOLATED_POOL` não integram o catálogo público, mesmo quando há valores internos legíveis.

## Como verificar

1. Identifique o contrato, sua implementação, a rede e o bloco da observação.
2. Refaça a leitura do contrato e registre o retorno bruto e os decimais.
3. Calcule o valor interno pela fórmula publicada e compare o resultado.
4. Confira restrições operacionais e a classificação da evidência (leitura atual ou registro histórico).

Consulte as fontes técnicas em inglês: [Metodologia](../METHODOLOGY.md) e [Verificação de dados](../DATA_VERIFICATION.md).

## Transparência e independência editorial

O ProtocolValue e o POU Protocolo são projetos distintos desenvolvidos pela **mesma equipe responsável**. O POU Protocolo deve satisfazer os mesmos critérios técnicos de inclusão e verificação exigidos dos demais protocolos. Publicidade não altera elegibilidade, validação ou classificação.

A documentação pública não implica divulgação de todo o código de produção e não representa auditoria de segurança dos contratos. A análise de reputação de domínio da Gridinsoft também não constitui auditoria de contratos.

## Idiomas

Interface: [English](https://protocolvalue.com/) · [Português (Brasil)](https://protocolvalue.com/?lang=pt)

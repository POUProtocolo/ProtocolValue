# Verificação independente dos dados

[🇺🇸 English](DATA_VERIFICATION.md) | **🇧🇷 Português (Brasil)** · [Documentação inicial](docs/README.pt-BR.md)

Para reproduzir um valor interno exibido por um protocolo:

1. Identifique o `chain ID`, o contrato de token/cota (`share`), o ativo subjacente e, quando aplicável, o proxy e sua implementação.
2. Fixe o número e o hash exatos do bloco. **Não misture valores provenientes de blocos diferentes.**
3. Documente cada `eth_call`: destino `to`, ABI/assinatura da função, `calldata`, parâmetro de bloco, saída hexadecimal bruta e valor inteiro decodificado.
4. Leia os `decimals` relevantes do token, da cota e do ativo subjacente no mesmo bloco, registrando origem e resultado.
5. Recalcule o valor interno com aritmética segura para inteiros e regra de arredondamento documentada. Compare com o valor exibido e registre as unidades.
6. Confirme que a observação é elegível e que seu estado de ciclo de vida não foi excluído da distribuição pública.

Este repositório inclui três **exemplos arquivados, exportados do site**, em [`docs/evidence/`](docs/evidence/README.pt-BR.md). Esses arquivos **não foram novamente consultados e verificados de maneira independente** e não devem ser descritos como validações independentes. Examine os campos `approval`, `block`, `callData` e `valuation` antes de citá-los. Um verificador deve falhar de forma segura quando dados obrigatórios não estiverem disponíveis; não substitua respostas RPC ausentes por valores hipotéticos.

Os dados brutos dos contratos e o valor interno calculado podem ser comparados independentemente com endpoints RPC públicos ou exploradores de blocos. Auditoria de contratos inteligentes e testes de resgate são atividades distintas.

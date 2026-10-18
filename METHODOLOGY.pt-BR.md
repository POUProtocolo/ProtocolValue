# Metodologia do ProtocolValue

[🇺🇸 English](METHODOLOGY.md) | **🇧🇷 Português (Brasil)** · [Documentação inicial](docs/README.pt-BR.md)

O ProtocolValue concentra-se exclusivamente no **valor interno on-chain por token/cota/unidade definido pelo protocolo**, e não em cotações de mercado, capitalização de tokens ou promessa de que o titular possa resgatar esse valor.

## Elegibilidade

1. O contrato e a rede devem ser identificáveis e acessíveis por infraestrutura pública de blockchain.
2. O valor interno por token/cota/share definido deve poder ser lido de forma verificável ou calculado deterministicamente a partir do estado dos contratos em um bloco reproduzível.
3. A evidência deve documentar endereço, chain ID, número ou hash do bloco, métodos e argumentos relevantes, valores brutos, precisão inteira/decimais, fórmulas, arredondamento e unidade final.
4. Quando houver proxy, deve-se documentar sua implementação e o mecanismo utilizado para identificá-la no bloco da observação.
5. Devem ser registradas limitações e situação de validação; registros de pesquisa `PENDING_VALIDATION` não equivalem à aprovação completa.
6. Registros com estados `EOL`, `DEPRECATED` ou `SUNSET_ISOLATED_POOL` não devem ser publicados no catálogo público nem no respectivo índice JSON distribuído.

A existência de uma cotação de mercado não desqualifica um protocolo; tal cotação não é o objeto do ProtocolValue. Não se deve afirmar ausência de cobertura por agregadores sem verificação específica.

## Proveniência dos dados

O site apresenta leituras de contratos no bloco corrente quando há suporte e, em outros casos, identifica os registros como snapshots. Um JSON arquivado, isoladamente, não prova que uma consulta RPC tenha sido executada de forma independente. Siga as etapas em [DATA_VERIFICATION.pt-BR.md](DATA_VERIFICATION.pt-BR.md).

Um valor interno apresentado **não comprova** liquidez, possibilidade de saque ou resgate, solvência nem segurança do protocolo.

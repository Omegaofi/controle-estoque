# Cripta de Vorgath (Android)

Dungeon crawler em primeira pessoa: desça os dois andares da cripta, ache as chaves das portas de ferro e destrua o lich Vorgath.

## Instalar

1. Baixe [`CriptaDeVorgath.apk`](CriptaDeVorgath.apk) no celular (Android 7.0 ou mais novo).
2. Abra o arquivo e permita "instalar apps desconhecidos" quando o Android pedir.
3. O jogo funciona offline; as fontes e tudo mais vão dentro do APK.

## Controles

- **↑ ↓** andar · **↶ ↷** virar · **← →** passo lateral
- **Atacar** (ou andar contra um inimigo) · **Bola de fogo** 4 PM · **Curar** 5 PM · **Poção** +20 PV
- Teclado físico: `W S A D Q E`, `Espaço`, `F`, `H`, `P`, `M` (mapa)

## Compilar

```sh
./build.sh
```

Não precisa do Android SDK: o script baixa `aapt2` (PyPI), `android.jar`, `dx` e `apksig` (Maven Central) para `.tools/` e gera `CriptaDeVorgath.apk` assinado (esquema v2). Requer JDK 11+, Python 3, `curl`, `unzip` e `zip`.

`keystore.p12` (senha `vorgath`) é uma chave de desenvolvimento; mantenha a mesma chave para que novas versões instalem por cima da antiga. Para publicar na Play Store, gere uma chave própria e guarde-a fora do repositório.

## Estrutura

- `app/assets/index.html` — o jogo (canvas + raycasting, sem dependências)
- `app/java/.../MainActivity.java` — WebView em tela cheia
- `tools/` — ícone, zipalign e assinatura

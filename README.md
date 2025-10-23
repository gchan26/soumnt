# 🕒 Soumnt! — "Só um minuto..."

<p align="center">
  <img src="assets/logo-soumnt.png" alt="Soumnt Logo" width="128"/>
</p>

**Soumnt** é um app multiplataforma (Windows & macOS) feito com **Electron**, que baixa vídeos do YouTube em alta velocidade — tão rápido que mal dá tempo de pronunciar “Só um minuto”! ⚡  

---

## ✨ Funcionalidades

- 🔽 Baixa vídeos do YouTube em alta qualidade (`yt-dlp` integrado)  
- 🎧 Suporte a conversão automática para MP4 com `ffmpeg` embutido  
- 💾 Escolha de diretório de saída  
- 📊 Log de progresso em tempo real na interface  
- 🖼️ Interface estilizada no tema **Catppuccin**  
- ⚙️ Totalmente offline — os binários do `yt-dlp` e `ffmpeg` são incluídos no app final  

---

## 🚀 Instalação e uso

### 💻 Windows
1. Baixe a última release:  
   👉 [Releases do Soumnt](https://github.com/gchan26/soumnt/releases)
2. Extraia o arquivo `Soumnt-win-x64.zip`
3. Execute `Soumnt.exe`
4. Se o Windows mostrar o aviso do SmartScreen, clique em **Mais informações → Executar mesmo assim**

---

### 🍎 macOS
1. Baixe `Soumnt-mac-arm64.zip` (ou `Soumnt-mac-x64.zip`, se for Intel)
2. Extraia o arquivo `.zip`
3. Arraste `Soumnt.app` para a pasta **Aplicativos**
4. Se o macOS bloquear, clique com o botão direito → **Abrir**

---

## 🧩 Estrutura do projeto

```
soumnt/
├── assets/                   # Ícones, logo etc.
├── build/                    # Ícone convertido (gerado automaticamente)
├── resources/
│   └── bin/
│       ├── win/              # yt-dlp.exe e ffmpeg.exe (Windows)
│       └── mac/              # yt-dlp e ffmpeg (Mac)
├── src/
│   ├── main.js               # Lógica principal do Electron
│   ├── preload.js
│   ├── index.html
│   └── styles.css
├── package.json
└── .github/
    └── workflows/
        ├── release-win.yml   # Build automático do .exe
        └── release-mac.yml   # (Opcional) Build do .app
```

---

## ⚙️ Desenvolvimento local

```bash
# Instalar dependências
npm install

# Rodar em modo dev
npm start
```

### Estrutura de recursos (binários locais)

Os binários são baixados automaticamente no build, mas você pode testá-los localmente:
```bash
brew install yt-dlp ffmpeg
```

---

## 🏗️ Build manual

### macOS
```bash
ARCH=$(uname -m | grep -q arm64 && echo arm64 || echo x64)
npx electron-packager . "Soumnt" --platform=darwin --arch="$ARCH" --out=dist --overwrite --icon=build/icon.icns --asar --asar.unpackDir=resources/bin
```

### Windows (via GitHub Actions)
Os builds de Windows são gerados automaticamente no workflow:
```
.github/workflows/release-win.yml
```
Cada nova tag `vX.Y.Z` cria um `.zip` executável e o publica em **Releases**.

---

## 📦 Tecnologias usadas

- [Electron](https://www.electronjs.org/)  
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)  
- [FFmpeg](https://ffmpeg.org/)  
- [Catppuccin Theme](https://catppuccin.com/)  
- GitHub Actions (CI/CD)

---

## 🧠 Conceito

> “O nome *Soumnt* vem de ‘Só Um Minuto’, porque o app baixa vídeos tão rápido que mal dá tempo de falar a frase inteira.” — *Guic*

Feito com ❤️, café e ... SOUMNT! ☕🎞️  
Desenvolvido por [@gchan26](https://github.com/gchan26)

---

```
MIT License © 2025 Guilherme Chan
```

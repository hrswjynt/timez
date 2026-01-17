# Timez ⏳

**Timez** is a beautiful, minimalist browser extension for Firefox that helps you manage your time effectively. It combines four essential productivity tools into one sleek, dark-mode interface.

## ✨ Features

-   **⏱️ Timer**:
    -   Multiple presets (5m, 15m, 30m).
    -   Smooth "IOS-style" wheel pickers for custom time input.
    -   Progress ring animations.
    -   **Persistence**: Remembers your timer state even if you close the popup.

-   **⏲️ Stopwatch**:
    -   Precise styling with lap functionality.
    -   Visual indicators for fast (green) and slow (red) laps.
    -   **Persistence**: Continues running in the background.

-   **⏰ Alarm**:
    -   Set one-time or recurring alarms (specific days of the week).
    -   "Smart Context" displays exactly when the next alarm will ring (e.g., "Tomorrow - Mon, Jan 15").
    -   Reliable background notifications.

-   **🌍 World Clock**:
    -   Track multiple timezones instantly.
    -   Clean, easy-to-read list view.

## 🛠️ Tech Stack

-   **Framework**: [Svelte 5](https://svelte.dev/) (Runes & Reactivity)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Bundler**: [Vite](https://vitejs.dev/)
-   **Platform**: Firefox WebExtension (Manifest V3)

## 🚀 Installation

### Using the Release Zip
1.  Download `timez-extension.zip`.
2.  Unzip it.
3.  Open Firefox and go to `about:debugging`.
4.  Click **"This Firefox"**.
5.  Click **"Load Temporary Add-on"**.
6.  Select the `manifest.json` file inside the unzipped folder.

### From Source
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the project:
    ```bash
    npm run build
    ```
4.  Load the extension in Firefox (point to the `dist/` folder).

## 💻 Development

-   **Development Server**:
    ```bash
    npm run dev
    ```
-   **Build Extension**:
    ```bash
    npm run build
    ```
    *Creates a production-ready `dist` folder.*

-   **Package for Publishing**:
    ```bash
    npm run zip
    ```
    *Creates a `timez-extension.zip` file ready for the Firefox Add-ons store.*

## 📄 License

MIT

const constanst = {
    // Local dev overrides this via VITE_API_URL in .env.development.local.
    API_URL: import.meta.env.VITE_API_URL || "https://stage-saloon.ikodestudio.com/api",
}
export default constanst;
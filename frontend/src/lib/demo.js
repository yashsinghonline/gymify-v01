// Device-only build (VITE_DEMO=1): the app as a plain static site.
//
// A static host serves files and nothing else, so there is no API: passkey sign-in, sync between
// devices, the Coach and the admin dashboard all need the Node backend and are not part of this
// build. The app stays in guest mode: everything is kept in this browser (localStorage), starts
// empty, and belongs to whoever opened it. The first thing it does is ask who that is
// (views/Welcome.jsx, lib/me.js).
//
// The flag keeps upstream's name so the build command and the Pages workflow stay as they are.
// Vite replaces it at build time, so what is behind it folds away in a self-hosted bundle.
export const DEMO = import.meta.env.VITE_DEMO === '1'
// Earlier builds of this flag filled the profile with an invented training history and left this
// mark. A browser that still carries it is holding example data, not anyone's own: boot empties
// it once (store/useStore.js) and removes the mark.
export const DEMO_SEEDED = 'gym_demo_seeded_v1'

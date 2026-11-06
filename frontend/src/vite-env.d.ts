/// <reference types="vite/client" />

/** Chỉ true khi Vite serve development; mọi vite build đều false. Không phải quyền Backend. */
declare const __KIOSK_DEVELOPMENT__: boolean;

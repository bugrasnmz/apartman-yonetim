/**
 * Performance Utilities for Lazy Loading and Code Splitting
 * These utilities improve initial load time by deferring non-critical resources
 */

// ===== Intersection Observer based Lazy Loading =====
let lazyLoadObserver = null;

/**
 * Initialize lazy loading for images and other elements
 */
export function initLazyLoading() {
    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers: load everything immediately
        document.querySelectorAll('[data-src]').forEach(el => {
            el.src = el.dataset.src;
        });
        return;
    }

    lazyLoadObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadElement(entry.target);
                    lazyLoadObserver.unobserve(entry.target);
                }
            });
        },
        {
            rootMargin: '50px 0px', // Load slightly before visible
            threshold: 0.01
        }
    );

    // Observe all lazy elements
    document.querySelectorAll('[data-src], [data-lazy]').forEach(el => {
        lazyLoadObserver.observe(el);
    });
}

/**
 * Load a lazy element
 */
function loadElement(el) {
    if (el.dataset.src) {
        el.src = el.dataset.src;
        el.removeAttribute('data-src');
    }
    if (el.dataset.srcset) {
        el.srcset = el.dataset.srcset;
        el.removeAttribute('data-srcset');
    }
    el.classList.add('loaded');
}

// ===== Dynamic Script Loading =====
const loadedScripts = new Set();

/**
 * Dynamically load a script only when needed
 * @param {string} src - Script URL
 * @returns {Promise} - Resolves when script is loaded
 */
export function loadScript(src) {
    if (loadedScripts.has(src)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            loadedScripts.add(src);
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ===== Section-based Code Loading =====
const sectionModules = {
    dashboard: null,
    transactions: null,
    bills: null,
    dues: null,
    decisions: null,
    apartments: null,
    settings: null
};

/**
 * Load section-specific code when user navigates to it
 * This is a placeholder for future module splitting
 */
export async function loadSectionModule(sectionName) {
    if (sectionModules[sectionName]) {
        return sectionModules[sectionName];
    }

    // Future: Dynamic import when build system is added
    // const module = await import(`./sections/${sectionName}.js`);
    // sectionModules[sectionName] = module;
    // return module;

    console.log(`Section ${sectionName} would be lazy-loaded with build system`);
    return null;
}

// ===== Idle Callback for Non-Critical Work =====
/**
 * Schedule non-critical work during idle time
 */
export function scheduleIdleWork(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, { timeout });
    } else {
        // Fallback: use setTimeout
        return setTimeout(callback, 1);
    }
}

// ===== Preload Critical Resources =====
/**
 * Preload a resource for faster future load
 */
export function preloadResource(href, as = 'script') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
}

// ===== Connection-aware Loading =====
/**
 * Check if user has slow connection
 */
export function isSlowConnection() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        // Save-Data header or 2G/slow-2G connection
        return conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType);
    }
    return false;
}

/**
 * Reduce quality/features for slow connections
 */
export function optimizeForConnection() {
    if (isSlowConnection()) {
        // Disable animations
        document.documentElement.classList.add('reduce-motion');
        // Skip non-essential images
        document.querySelectorAll('img[data-optional]').forEach(img => {
            img.remove();
        });
        console.log('Slow connection detected: Reduced features applied');
    }
}

// ===== Initialize on DOM Ready =====
export function initPerformanceUtils() {
    // Initialize lazy loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initLazyLoading();
            optimizeForConnection();
        });
    } else {
        initLazyLoading();
        optimizeForConnection();
    }

    // Schedule non-critical analytics/tracking
    scheduleIdleWork(() => {
        // Future: Load analytics, error tracking, etc.
        console.log('Idle time: Ready for non-critical work');
    });
}

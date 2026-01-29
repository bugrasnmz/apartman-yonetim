/* =========================================
   UI Module - Theme, Cursor, Skeleton, Modal, Toast
   ========================================= */

// ===== Theme Management =====
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ===== Custom Cursor =====
export function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot') as HTMLElement;
    const outline = document.querySelector('.cursor-outline') as HTMLElement;

    if (!dot || !outline) return;

    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;

    // Mouse move
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Move dot immediately
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
    });

    // Smooth outline following
    function animateOutline() {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        outline.style.left = outlineX + 'px';
        outline.style.top = outlineY + 'px';

        requestAnimationFrame(animateOutline);
    }
    animateOutline();

    // Hover effects
    document.querySelectorAll('a, button, .card, input, select, textarea, .nav-link, .table-row').forEach(el => {
        el.addEventListener('mouseenter', () => {
            dot.classList.add('hovering');
            outline.classList.add('hovering');
        });
        el.addEventListener('mouseleave', () => {
            dot.classList.remove('hovering');
            outline.classList.remove('hovering');
        });
    });

    // Click effect
    document.addEventListener('mousedown', () => {
        dot.classList.add('clicking');
        outline.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
        dot.classList.remove('clicking');
        outline.classList.remove('clicking');
    });
}

// ===== Skeleton Loading Helpers =====
export function createSkeletonCards(count = 3, type = 'stat') {
    if (type === 'stat') {
        return Array(count).fill(`
            <div class="stat-card skeleton-shimmer" style="min-height:100px;">
                <div class="skeleton-text" style="width:60%;height:14px;margin-bottom:8px;"></div>
                <div class="skeleton-text" style="width:40%;height:24px;"></div>
            </div>
        `).join('');
    }
    if (type === 'table-row') {
        return Array(count).fill(`
            <tr class="skeleton-shimmer">
                <td><div class="skeleton-text" style="width:80%;height:14px;"></div></td>
                <td><div class="skeleton-text" style="width:60%;height:14px;"></div></td>
                <td><div class="skeleton-text" style="width:50%;height:14px;"></div></td>
                <td><div class="skeleton-text" style="width:40%;height:14px;"></div></td>
            </tr>
        `).join('');
    }
    if (type === 'card') {
        return Array(count).fill(`
            <div class="card skeleton-shimmer" style="min-height:150px;">
                <div class="skeleton-text" style="width:70%;height:18px;margin-bottom:12px;"></div>
                <div class="skeleton-text" style="width:90%;height:14px;margin-bottom:8px;"></div>
                <div class="skeleton-text" style="width:50%;height:14px;"></div>
            </div>
        `).join('');
    }
    return '';
}

export function showSkeleton(containerId, count = 3, type = 'stat') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = createSkeletonCards(count, type);
    }
}

export function hideSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('.skeleton-shimmer').forEach(el => el.remove());
    }
}

// ===== Modal Management =====
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

export function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
}

// ===== Toast Notifications =====
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

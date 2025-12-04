// DOM Elements
const root = document.documentElement;
const inputs = {
    primary: document.getElementById('seed-primary'),
    neutral: document.getElementById('seed-neutral'),
    accent: document.getElementById('seed-accent'),
    success: document.getElementById('seed-success'),
    warning: document.getElementById('seed-warning'),
    error: document.getElementById('seed-error')
};
const themeBtns = document.querySelectorAll('.theme-btn');
const cssOutput = document.getElementById('css-output');
const copyBtn = document.getElementById('copy-btn');
const randomSeedsBtn = document.getElementById('random-seeds-btn');
const randomStatusBtn = document.getElementById('random-status-btn');

// Collapsible Sections Logic
function initCollapsibleSections() {
    const collapsibleSections = document.querySelectorAll('.collapsible');
    const savedStates = JSON.parse(localStorage.getItem('webcolors_collapsed_sections') || '{}');

    collapsibleSections.forEach(section => {
        const sectionId = section.dataset.section;
        const toggle = section.querySelector('.collapse-toggle');
        const header = section.querySelector('.section-header');

        // Restore saved state
        if (savedStates[sectionId]) {
            section.classList.add('collapsed');
        }

        // Add click handler to both header and toggle button
        const toggleSection = (e) => {
            e.stopPropagation();
            section.classList.toggle('collapsed');

            // Save state
            const currentStates = JSON.parse(localStorage.getItem('webcolors_collapsed_sections') || '{}');
            currentStates[sectionId] = section.classList.contains('collapsed');
            localStorage.setItem('webcolors_collapsed_sections', JSON.stringify(currentStates));
        };

        toggle.addEventListener('click', toggleSection);
        header.addEventListener('click', (e) => {
            // Only toggle if clicking the header itself, not child buttons
            if (e.target === header || e.target.tagName === 'H3') {
                toggleSection(e);
            }
        });
    });
}


// Color Conversion Logic
function hexToOklch(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse RGB
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert sRGB to Linear sRGB
    const toLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    r = toLinear(r);
    g = toLinear(g);
    b = toLinear(b);

    // Convert Linear sRGB to LMS (approximate for OKLab)
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    // Apply non-linearity (cube root)
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    // Convert to OKLab
    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    const b_val = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

    // Convert to OKLCH
    const C = Math.sqrt(a * a + b_val * b_val);
    let H = Math.atan2(b_val, a) * (180 / Math.PI);

    if (H < 0) H += 360;

    // Formatting
    // L is 0-1, usually displayed as percentage in CSS
    // C is usually 0-0.4
    // H is 0-360

    return `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(3)} ${H.toFixed(2)})`;
}

// Helper: HSL to Hex
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function randomizeSeeds() {
    // 1. Random Primary Hue
    const primaryHue = Math.floor(Math.random() * 360);
    // ACCESSIBILITY: Constrain Lightness to 40-55% for good contrast with white text
    // High saturation (>70%) for vibrancy
    inputs.primary.value = hslToHex(primaryHue, 80, 48);

    // 2. Neutral: Same hue, very low saturation
    // ACCESSIBILITY: Mid-range lightness (40-60%) to avoid pure black/white seeds
    inputs.neutral.value = hslToHex(primaryHue, 10, 50);

    // 3. Accent: Complementary hue (+180deg) or Split Complementary
    const accentHue = (primaryHue + 180) % 360;
    // ACCESSIBILITY: High saturation, slightly lighter but still visible
    inputs.accent.value = hslToHex(accentHue, 90, 60);

    updateColors();
}

function randomizeStatus() {
    // Semantic Ranges (approximate)
    // ACCESSIBILITY: All status colors constrained to L=45-55% for consistent contrast

    // Success: Green (120-160)
    const successHue = 120 + Math.floor(Math.random() * 40);
    inputs.success.value = hslToHex(successHue, 85, 48);

    // Warning: Yellow/Orange (30-60)
    // Yellow needs to be darker to have contrast with white, so we lean towards Orange (30-45)
    // or lower the lightness significantly for pure yellow.
    // Let's stick to a warm Amber/Orange range (30-50) for better visibility.
    const warningHue = 30 + Math.floor(Math.random() * 20);
    inputs.warning.value = hslToHex(warningHue, 95, 50);

    // Error: Red (340-20) - handling wrap around 360
    let errorHue = Math.floor(Math.random() * 40) - 10; // -10 to 30
    if (errorHue < 0) errorHue += 360;
    inputs.error.value = hslToHex(errorHue, 90, 50);

    updateColors();
}

// WCAG Contrast Calculation Functions
function oklchToRgb(l, c, h) {
    // Convert OKLCH to OKLab
    const a = c * Math.cos(h * Math.PI / 180);
    const b = c * Math.sin(h * Math.PI / 180);

    // OKLab to Linear RGB
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let b_val = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    // Linear RGB to sRGB
    const toSrgb = (c) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    r = Math.max(0, Math.min(1, toSrgb(r)));
    g = Math.max(0, Math.min(1, toSrgb(g)));
    b_val = Math.max(0, Math.min(1, toSrgb(b_val)));

    return { r, g, b: b_val };
}

function getRelativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function getBestTextColor(bgOklch) {
    // Parse OKLCH string: "oklch(50% 0.15 270)"
    const match = bgOklch.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match) return 'oklch(0% 0 0)'; // fallback to black

    const [, l, c, h] = match.map(Number);
    const bgRgb = oklchToRgb(l / 100, c, h);
    const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    // Test white and black
    const whiteLuminance = 1;
    const blackLuminance = 0;

    const contrastWithWhite = getContrastRatio(bgLuminance, whiteLuminance);
    const contrastWithBlack = getContrastRatio(bgLuminance, blackLuminance);

    // Choose the one with better contrast
    if (contrastWithWhite > contrastWithBlack) {
        return `oklch(98% 0.005 ${h})`; // Very light, slight hue tint
    } else {
        return `oklch(20% 0.02 ${h})`; // Very dark, slight hue tint
    }
}

function updateColors() {
    const primaryOklch = hexToOklch(inputs.primary.value);
    const neutralOklch = hexToOklch(inputs.neutral.value);
    const accentOklch = hexToOklch(inputs.accent.value);
    const successOklch = hexToOklch(inputs.success.value);
    const warningOklch = hexToOklch(inputs.warning.value);
    const errorOklch = hexToOklch(inputs.error.value);

    // Calculate optimal text colors based on contrast
    const onPrimary = getBestTextColor(primaryOklch);
    const onAccent = getBestTextColor(accentOklch);

    root.style.setProperty('--seed-primary', primaryOklch);
    root.style.setProperty('--seed-neutral', neutralOklch);
    root.style.setProperty('--seed-accent', accentOklch);
    root.style.setProperty('--seed-success', successOklch);
    root.style.setProperty('--seed-warning', warningOklch);
    root.style.setProperty('--seed-error', errorOklch);

    // Set calculated text colors
    root.style.setProperty('--color-on-primary', onPrimary);
    root.style.setProperty('--color-on-accent', onAccent);

    updateCSSOutput(primaryOklch, neutralOklch, accentOklch, successOklch, warningOklch, errorOklch, onPrimary, onAccent);
}

function updateCSSOutput(p, n, a, s, w, e, onPrimary, onAccent) {
    const css = `/*
 * DESIGN SYSTEM & VARIABLES
 * Generated by WebColors
 */
:root {
    /* 1. SEED COLORS */
    --seed-primary: ${p};
    --seed-neutral: ${n};
    --seed-accent: ${a};
    --seed-success: ${s};
    --seed-warning: ${w};
    --seed-error: ${e};

    /* 2. LIGHT MODE LOGIC (Default) */

    /* Primary Colors */
    --color-primary: var(--seed-primary);
    --color-primary-hover: oklch(from var(--seed-primary) calc(l - 0.05) c h);
    --color-primary-active: oklch(from var(--seed-primary) calc(l - 0.1) c h);
    --color-primary-subtle: oklch(from var(--seed-primary) 96% 0.05 h);
    --color-on-primary: ${onPrimary};

    /* Accent Colors */
    --color-accent: var(--seed-accent);
    --color-on-accent: ${onAccent};

    /* Backgrounds & Surfaces */
    --bg-canvas: oklch(from var(--seed-neutral) 99% 0.005 h);
    --bg-surface-1: oklch(100% 0 0);
    --bg-surface-2: oklch(from var(--seed-neutral) 96% 0.01 h);

    /* Borders */
    --border-dim: oklch(from var(--seed-neutral) 92% 0.01 h);
    --border-strong: oklch(from var(--seed-neutral) 80% 0.02 h);

    /* Text */
    --text-main: oklch(from var(--seed-neutral) 15% 0.02 h);
    --text-muted: oklch(from var(--seed-neutral) 45% 0.02 h);

    /* Status Colors (Semantic) */
    /* Light Mode: Light Background, Dark Text */
    --bg-success: oklch(from var(--seed-success) 95% 0.05 h);
    --text-success: oklch(from var(--seed-success) 30% 0.1 h);
    --border-success: var(--seed-success);

    --bg-warning: oklch(from var(--seed-warning) 95% 0.05 h);
    --text-warning: oklch(from var(--seed-warning) 30% 0.1 h);
    --border-warning: var(--seed-warning);

    --bg-error: oklch(from var(--seed-error) 95% 0.05 h);
    --text-error: oklch(from var(--seed-error) 30% 0.1 h);
    --border-error: var(--seed-error);
}

/* 3. DARK MODE LOGIC */
@media (prefers-color-scheme: dark) {
    :root:not(.theme-light) {
        /* Primary Colors */
        --color-primary-hover: oklch(from var(--seed-primary) calc(l + 0.05) c h);
        --color-primary-active: oklch(from var(--seed-primary) calc(l + 0.1) c h);
        --color-primary-subtle: oklch(from var(--seed-primary) 25% 0.05 h);

        /* Backgrounds & Surfaces */
        --bg-canvas: oklch(from var(--seed-neutral) 12% 0.01 h);
        --bg-surface-1: oklch(from var(--seed-neutral) 18% 0.01 h);
        --bg-surface-2: oklch(from var(--seed-neutral) 24% 0.01 h);

        /* Borders */
        --border-dim: oklch(from var(--seed-neutral) 25% 0.01 h);
        --border-strong: oklch(from var(--seed-neutral) 40% 0.02 h);

        /* Text */
        --text-main: oklch(from var(--seed-neutral) 98% 0.005 h);
        --text-muted: oklch(from var(--seed-neutral) 70% 0.01 h);

        /* Status Colors (Semantic) */
        /* Dark Mode: Dark Background, Light Text */
        --bg-success: oklch(from var(--seed-success) 20% 0.05 h);
        --text-success: oklch(from var(--seed-success) 90% 0.05 h);
        --border-success: oklch(from var(--seed-success) 40% 0.1 h);

        --bg-warning: oklch(from var(--seed-warning) 20% 0.05 h);
        --text-warning: oklch(from var(--seed-warning) 90% 0.05 h);
        --border-warning: oklch(from var(--seed-warning) 40% 0.1 h);

        --bg-error: oklch(from var(--seed-error) 20% 0.05 h);
        --text-error: oklch(from var(--seed-error) 90% 0.05 h);
        --border-error: oklch(from var(--seed-error) 40% 0.1 h);
    }
}

/* Manual Theme Overrides */
:root.theme-dark {
    --color-primary-hover: oklch(from var(--seed-primary) calc(l + 0.05) c h);
    --color-primary-active: oklch(from var(--seed-primary) calc(l + 0.1) c h);
    --color-primary-subtle: oklch(from var(--seed-primary) 25% 0.05 h);
    --bg-canvas: oklch(from var(--seed-neutral) 12% 0.01 h);
    --bg-surface-1: oklch(from var(--seed-neutral) 18% 0.01 h);
    --bg-surface-2: oklch(from var(--seed-neutral) 24% 0.01 h);
    --border-dim: oklch(from var(--seed-neutral) 25% 0.01 h);
    --border-strong: oklch(from var(--seed-neutral) 40% 0.02 h);
    --text-main: oklch(from var(--seed-neutral) 98% 0.005 h);
    --text-muted: oklch(from var(--seed-neutral) 70% 0.01 h);

    --bg-success: oklch(from var(--seed-success) 20% 0.05 h);
    --text-success: oklch(from var(--seed-success) 90% 0.05 h);
    --border-success: oklch(from var(--seed-success) 40% 0.1 h);
    --bg-warning: oklch(from var(--seed-warning) 20% 0.05 h);
    --text-warning: oklch(from var(--seed-warning) 90% 0.05 h);
    --border-warning: oklch(from var(--seed-warning) 40% 0.1 h);
    --bg-error: oklch(from var(--seed-error) 20% 0.05 h);
    --text-error: oklch(from var(--seed-error) 90% 0.05 h);
    --border-error: oklch(from var(--seed-error) 40% 0.1 h);
}

:root.theme-light {
    --color-primary-hover: oklch(from var(--seed-primary) calc(l - 0.05) c h);
    --color-primary-active: oklch(from var(--seed-primary) calc(l - 0.1) c h);
    --color-primary-subtle: oklch(from var(--seed-primary) 96% 0.05 h);
    --bg-canvas: oklch(from var(--seed-neutral) 99% 0.005 h);
    --bg-surface-1: oklch(100% 0 0);
    --bg-surface-2: oklch(from var(--seed-neutral) 96% 0.01 h);
    --border-dim: oklch(from var(--seed-neutral) 92% 0.01 h);
    --border-strong: oklch(from var(--seed-neutral) 80% 0.02 h);
    --text-main: oklch(from var(--seed-neutral) 15% 0.02 h);
    --text-muted: oklch(from var(--seed-neutral) 45% 0.02 h);

    --bg-success: oklch(from var(--seed-success) 95% 0.05 h);
    --text-success: oklch(from var(--seed-success) 30% 0.1 h);
    --border-success: var(--seed-success);
    --bg-warning: oklch(from var(--seed-warning) 95% 0.05 h);
    --text-warning: oklch(from var(--seed-warning) 30% 0.1 h);
    --border-warning: var(--seed-warning);
    --bg-error: oklch(from var(--seed-error) 95% 0.05 h);
    --text-error: oklch(from var(--seed-error) 30% 0.1 h);
    --border-error: var(--seed-error);
}`;
    cssOutput.textContent = css;
}

// Event Listeners
Object.values(inputs).forEach(input => {
    input.addEventListener('input', updateColors);
});

// Theme Toggle
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        themeBtns.forEach(b => b.classList.remove('active'));
        // Add to clicked
        btn.classList.add('active');

        const theme = btn.dataset.theme;
        root.classList.remove('theme-light', 'theme-dark');
        if (theme !== 'auto') {
            root.classList.add(`theme-${theme}`);
        }
    });
});

// Copy CSS
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(cssOutput.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
});

const saveBtn = document.getElementById('save-btn');
const savedList = document.getElementById('saved-palettes-list');


function savePalette() {
    const palette = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        colors: {
            primary: inputs.primary.value,
            neutral: inputs.neutral.value,
            accent: inputs.accent.value,
            success: inputs.success.value,
            warning: inputs.warning.value,
            error: inputs.error.value
        }
    };

    const saved = JSON.parse(localStorage.getItem('webcolors_palettes') || '[]');
    saved.unshift(palette); // Add to top
    localStorage.setItem('webcolors_palettes', JSON.stringify(saved));

    renderSavedPalettes();
}

function loadPalette(id) {
    const saved = JSON.parse(localStorage.getItem('webcolors_palettes') || '[]');
    const palette = saved.find(p => p.id === id);

    if (palette) {
        inputs.primary.value = palette.colors.primary;
        inputs.neutral.value = palette.colors.neutral;
        inputs.accent.value = palette.colors.accent;
        inputs.success.value = palette.colors.success;
        inputs.warning.value = palette.colors.warning;
        inputs.error.value = palette.colors.error;

        updateColors();
    }
}

function deletePalette(id, event) {
    event.stopPropagation(); // Prevent loading when deleting
    const saved = JSON.parse(localStorage.getItem('webcolors_palettes') || '[]');
    const newSaved = saved.filter(p => p.id !== id);
    localStorage.setItem('webcolors_palettes', JSON.stringify(newSaved));
    renderSavedPalettes();
}

function renderSavedPalettes() {
    const saved = JSON.parse(localStorage.getItem('webcolors_palettes') || '[]');
    savedList.innerHTML = '';

    if (saved.length === 0) {
        savedList.innerHTML = '<div style="font-size: 0.875rem; color: var(--text-muted); font-style: italic;">No saved palettes yet.</div>';
        return;
    }

    saved.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            padding: 0.5rem; 
            background: var(--bg-surface-2); 
            border: 1px solid var(--border-dim); 
            border-radius: 0.375rem; 
            cursor: pointer;
            transition: background 0.2s;
        `;
        item.onmouseover = () => item.style.background = 'var(--bg-surface-1)';
        item.onmouseout = () => item.style.background = 'var(--bg-surface-2)';
        item.onclick = () => loadPalette(p.id);

        const swatches = `
            <div style="display: flex; gap: 4px;">
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${p.colors.primary};"></div>
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${p.colors.neutral};"></div>
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${p.colors.accent};"></div>
            </div>
        `;

        const info = `
            <div style="flex: 1; margin-left: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
                ${p.timestamp.split(',')[0]}
            </div>
        `;

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '×';
        delBtn.style.cssText = `
            background: none; 
            border: none; 
            color: var(--text-muted); 
            font-size: 1.25rem; 
            cursor: pointer; 
            padding: 0 0.25rem;
            line-height: 1;
        `;
        delBtn.onclick = (e) => deletePalette(p.id, e);
        delBtn.onmouseover = () => delBtn.style.color = 'var(--text-error)';
        delBtn.onmouseout = () => delBtn.style.color = 'var(--text-muted)';

        item.innerHTML = swatches + info;
        item.appendChild(delBtn);
        savedList.appendChild(item);
    });
}

randomSeedsBtn.addEventListener('click', randomizeSeeds);
randomStatusBtn.addEventListener('click', randomizeStatus);
saveBtn.addEventListener('click', savePalette);

// Share button
const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', copyShareUrl);

// URL Sharing Functions
function parseOklchFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const colorMap = {
        'p': 'primary',
        'n': 'neutral',
        'a': 'accent',
        's': 'success',
        'w': 'warning',
        'e': 'error'
    };

    let hasParams = false;

    for (const [key, colorName] of Object.entries(colorMap)) {
        const value = params.get(key);
        if (value) {
            hasParams = true;
            // Parse L_C_H format
            const [l, c, h] = value.split('_').map(Number);

            // Convert OKLCH to hex for the color input
            const hex = oklchToHex(l, c, h);
            if (inputs[colorName]) {
                inputs[colorName].value = hex;
            }
        }
    }

    return hasParams;
}

function oklchToHex(l, c, h) {
    // Convert OKLCH to RGB
    const rgb = oklchToRgb(l / 100, c, h);

    // Convert RGB to hex
    const toHex = (val) => {
        const clamped = Math.max(0, Math.min(255, Math.round(val * 255)));
        return clamped.toString(16).padStart(2, '0');
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function generateShareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    const colorMap = {
        'primary': 'p',
        'neutral': 'n',
        'accent': 'a',
        'success': 's',
        'warning': 'w',
        'error': 'e'
    };

    for (const [colorName, key] of Object.entries(colorMap)) {
        const oklch = hexToOklch(inputs[colorName].value);
        // Parse "oklch(50.12% 0.150 270.45)" format
        const match = oklch.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/);
        if (match) {
            const [, l, c, h] = match;
            // Format: L_C_H (compact)
            params.set(key, `${l}_${c}_${h}`);
        }
    }

    return `${baseUrl}?${params.toString()}`;
}

function copyShareUrl() {
    const shareUrl = generateShareUrl();
    navigator.clipboard.writeText(shareUrl).then(() => {
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            const originalText = shareBtn.textContent;
            shareBtn.textContent = '✓ Link Copied!';
            setTimeout(() => {
                shareBtn.textContent = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy URL:', err);
        alert('Failed to copy URL to clipboard');
    });
}

// Initial Load
// Detect system theme preference and set active button
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = prefersDark ? 'dark' : 'light';

// Set active class on the appropriate button
themeBtns.forEach(btn => {
    if (btn.dataset.theme === initialTheme) {
        btn.classList.add('active');
    }
});

// Apply theme class to root
root.classList.add(`theme-${initialTheme}`);

// Initialize collapsible sections
initCollapsibleSections();

// Parse URL parameters if present (for shared palettes)
const hasUrlParams = parseOklchFromUrl();

updateColors();
renderSavedPalettes();

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

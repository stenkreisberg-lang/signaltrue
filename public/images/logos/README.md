# Company Logos - IMPORTANT

## ⚠️ REPLACE PLACEHOLDER LOGOS

The current SVG files are **placeholders** with company names as text.

You MUST replace them with **official brand logos** from each company.

---

## Required Logos (6 Total)

1. **Supermetrics** - supermetrics.svg
2. **Netguru** - netguru.svg  
3. **Synthesia** - synthesia.svg
4. **Toggl** - toggl.svg
5. **Sharewell** - sharewell.svg
6. **Cleveron** - cleveron.svg

---

## Where to Get Official Logos

### Option 1: Company Brand/Press Kits
- Visit each company's website
- Look for "Press Kit", "Brand Assets", or "Media Kit" in footer
- Download official SVG or high-res PNG logos

### Option 2: Direct Contact
- Email each company's marketing team
- Request permission to use their logo
- Ask for SVG format (preferred) or high-res PNG

### Option 3: Brand Resource Sites
- [Brandfetch](https://brandfetch.com) - Search company name
- [Clearbit Logo API](https://clearbit.com/logo) - `https://logo.clearbit.com/{domain}`
- Company LinkedIn pages (often have downloadable logos)

---

## Logo Requirements

✅ **Format:** SVG preferred, PNG acceptable  
✅ **Resolution:** High-res (min 2x retina display)  
✅ **Aspect Ratio:** Preserve original proportions  
✅ **File Size:** Optimize for web (use [SVGOMG](https://jakearchibald.github.io/svgomg/) for SVG)

❌ **DO NOT:**
- Use low-resolution images
- Distort or modify logos
- Use unofficial/fan-made versions

---

## Replacement Instructions

1. Download official logo from brand kit
2. Rename file to match existing filename (e.g., `supermetrics.svg`)
3. Replace placeholder file in this directory
4. Test carousel to ensure all logos display correctly
5. Verify logos are normalized to similar visual weight/height

---

## Visual Normalization

All logos should:
- Appear roughly the same **height** (32px on desktop, 28px on mobile)
- Have similar **visual weight** (not one logo dominating others)
- Be displayed in **grayscale** or **muted brand color** (handled by CSS)

CSS handles:
- Grayscale filter (`filter: grayscale(100%)`)
- Opacity (`opacity: 0.4`, hover: `0.6`)
- Height normalization (`height: 32px`)

You only need to provide clean, high-quality logo files.

---

## Legal Note

✅ You must have **permission** to use each company's logo.  
✅ This is social proof, not an endorsement claim.  
✅ If you worked with/for these companies, logo usage is generally permitted for reference purposes.

⚠️ If uncertain, **contact the company** before deploying to production.

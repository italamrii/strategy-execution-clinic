# 3D Rendering Strategy — Strategy & Execution Clinic

3D is **progressive enhancement**. The product remains complete without WebGL.

---

## 1. Stack

- Three.js
- React Three Fiber
- Drei
- Lazy dynamic import from Client Components only
- Never in the verification page bundle

---

## 2. Signature hero (later landing)

Architectural installation: white + muted metallic gold. Communicates alignment → execution → impact. Subtle camera. Subtle parallax. Not sci-fi, not particles.

Phase 0 design preview: a restrained gold-trimmed white block (institutional plinth) with PBR lighting and a static image fallback.

---

## 3. Membership card (Phase 3 visual)

Visual 3D card (thickness, bevel, restrained gold). Authoritative data always from the credential DTO. Hover tilt on desktop; optional gyroscope if `permission` allows; never required.

---

## 4. Performance rules

- Dynamic `import()`; do not block FCP
- Suspend when offscreen
- Pause when `document.hidden`
- Honor `prefers-reduced-motion` (static frame)
- Mobile: lower DPR cap (e.g. 1.5), simpler lights
- If WebGL unavailable or GPU denylist: high-quality static render
- Texture/poly budgets documented per asset when GLB is added
- Draco/meshopt when GLB ships (not Phase 0 primitive)

---

## 5. Accessibility

No information exists only in 3D. Hero has H1 and body copy. Card 3D has a text/HTML card alternative.

---

## 6. Security

No user-supplied GLTF. No fetching models from applicant URLs (SSRF).

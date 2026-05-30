# Standard Mathematics Markdown & LaTeX Formula Guide

This guide describes how to write high-quality mathematical equations and formulas in this platform using Markdown and LaTeX notation. The platform utilizes **KaTeX** and **MathJax** rendering engines via a `MathRenderer` component, enabling instant, pixel-perfect mathematical notation.

---

## 1. Core Syntax & Delimiters

Mathematical equations are separated from standard markdown using **dollar signs ($)**.

### A. Inline Formulas
For formulas that appear inline with normal text, wrap the LaTeX code in a **single dollar sign (`$`)**.
* **Markdown Input:** `The Pythagorean theorem is $a^2 + b^2 = c^2$, which applies to right-angled triangles.`
* **Result In-App:** The Pythagorean theorem is $a^2 + b^2 = c^2$, which applies to right-angled triangles.

### B. Display / Block Formulas
For larger, centered formulas on a new line, wrap the LaTeX code in **double dollar signs (`$$`)**.
* **Markdown Input:**
  ```markdown
  $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
  ```
* **Result In-App:**
  $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

---

## 2. Basic Arithmetic & Algebraic Foundations

| Mathematical Expression | LaTeX Syntax | Rendered Example |
| :--- | :--- | :--- |
| **Subscript** | `x_{i}` | $x_{i}$ |
| **Superscript (Exponent)** | `x^{2}` | $x^{2}$ |
| **Sub & Superscript Combined** | `x_{i}^{2}` | $x_{i}^{2}$ |
| **Basic Fractions** | `\frac{a}{b}` | $\frac{a}{b}$ |
| **Nested Fractions** | `\frac{1}{1 + \frac{1}{x}}` | $\frac{1}{1 + \frac{1}{x}}$ |
| **Square Root** | `\sqrt{x}` | $\sqrt{x}$ |
| **N-th Root** | `\sqrt[n]{x}` | $\sqrt[n]{x}$ |
| **Summation** | `\sum_{i=1}^{n} i` | $\sum_{i=1}^{n} i$ |
| **Product** | `\prod_{i=1}^{n} x_i` | $\prod_{i=1}^{n} x_i$ |

> 💡 **Grouping Note:** When a subscript or superscript contains more than one character, **always wrap them in curly braces `{}`**. For example, use `x^{10}` (renders as $x^{10}$) instead of `x^10` (which renders incorrectly as $x^10$).

---

## 3. Parentheses, Brackets, and Delimiters

To write brackets that dynamically scale and match the height of high formulas (like fractions or matrices), use `\left` and `\right` prefixes.

| Delimiter Pair | LaTeX Syntax | Rendered Example |
| :--- | :--- | :--- |
| **Standard Parentheses** | `\left( \frac{a}{b} \right)` | $\left( \frac{a}{b} \right)$ |
| **Square Brackets** | `\left[ \frac{a}{b} \right]` | $\left[ \frac{a}{b} \right]$ |
| **Curly Brackets** | `\left\{ \frac{a}{b} \right\}` | $\left\{ \frac{a}{b} \right\}$ |
| **Absolute Value / Norm** | `\left\| \vec{v} \right\|` or `\left\vert x \right\vert` | $\left\| \vec{v} \right\|$ and $\left\vert x \right\vert$ |
| **Angle Brackets** | `\left\langle \phi \right\rangle` | $\left\langle \phi \right\rangle$ |

---

## 4. Calculus & Analysis

| Mathematical Expression | LaTeX Syntax | Rendered Example |
| :--- | :--- | :--- |
| **Derivative (Leibniz)** | `\frac{dy}{dx}` | $\frac{dy}{dx}$ |
| **Partial Derivative** | `\frac{\partial f}{\partial x}` | $\frac{\partial f}{\partial x}$ |
| **Limit with Subtext** | `\lim_{x \to \infty} f(x)` | $\lim_{x \to \infty} f(x)$ |
| **Indefinite Integral** | `\int f(x) \, dx` | $\int f(x) \, dx$ |
| **Definite Integral** | `\int_{a}^{b} f(x) \, dx` | $\int_{a}^{b} f(x) \, dx$ |
| **Multiple Integral** | `\iint_{D} dx \, dy` | $\iint_{D} dx \, dy$ |

---

## 5. Linear Algebra, Matrices & Vectors

### A. Matrix Formats
Use standard matrix environments wrapped in `\begin{...}` and `\end{...}`. Each element in a row is separated by an ampersand (`&`), and rows are separated by double backslashes (`\\`).

* **Plain Matrix (`matrix`):**
  `\begin{matrix} a & b \\ c & d \end{matrix}` $\rightarrow$ $\begin{matrix} a & b \\ c & d \end{matrix}$
* **Parentheses Bracketed Matrix (`pmatrix`):**
  `\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}` $\rightarrow$ $\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$
* **Square Bracketed Matrix (`bmatrix`):**
  `\begin{bmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{bmatrix}` $\rightarrow$ $\begin{bmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{bmatrix}$
* **Determinant / Vertical Bars (`vmatrix`):**
  `\begin{vmatrix} x & y \\ z & w \end{vmatrix}` $\rightarrow$ $\begin{vmatrix} x & y \\ z & w \end{vmatrix}$

### B. Vectors and Accents
* **Vector arrow:** `\vec{v}` $\rightarrow$ $\vec{v}$
* **Bold notation:** `\mathbf{v}` $\rightarrow$ $\mathbf{v}$
* **Dot notation:** `\dot{x}`, `\ddot{x}` $\rightarrow$ $\dot{x}$, $\ddot{x}$
* **Hat/Unit Vector:** `\hat{u}` $\rightarrow$ $\hat{u}$

---

## 6. Greek Letters & Mathematical Symbols

### A. Greek Letters
Write lowercase letters with a backslash and the letter's name. Capitalize the first letter of the name for uppercase symbols.

| Name | Lowercase (LaTeX) | Output | Uppercase (LaTeX) | Output |
| :--- | :--- | :--- | :--- | :--- |
| **Alpha** | `\alpha` | $\alpha$ | `A` | $A$ |
| **Beta** | `\beta` | $\beta$ | `B` | $B$ |
| **Gamma** | `\gamma` | $\gamma$ | `\Gamma` | $\Gamma$ |
| **Delta** | `\delta` | $\delta$ | `\Delta` | $\Delta$ |
| **Epsilon** | `\epsilon` or `\varepsilon` | $\epsilon$ or $\varepsilon$ | `E` | $E$ |
| **Theta** | `\theta` | $\theta$ | `\Theta` | $\Theta$ |
| **Lambda** | `\lambda` | $\lambda$ | `\Lambda` | $\Lambda$ |
| **Pi** | `\pi` | $\pi$ | `\Pi` | $\Pi$ |
| **Sigma** | `\sigma` | $\sigma$ | `\Sigma` | $\Sigma$ |
| **Phi** | `\phi` or `\varphi` | $\phi$ or $\varphi$ | `\Phi` | $\Phi$ |
| **Omega** | `\omega` | $\omega$ | `\Omega` | $\Omega$ |

### B. Operators, Trigs, and Relations
* **Trigonometry:** `\sin(x)`, `\cos(\theta)`, `\tan(\alpha)`, `\log_2 (y)`, `\ln(e)` $\rightarrow$ $\sin(x)$, $\cos(\theta)$, $\tan(\alpha)$, $\log_2 (y)$, $\ln(e)$
* **Set Relations:** `\in`, `\notin`, `\subset`, `\cup`, `\cap`, `\emptyset` $\rightarrow$ $\in$, $\notin$, $\subset$, $\cup$, $\cap$, $\emptyset$
* **Comparison:** `\le`, `\ge`, `\ne`, `\approx`, `\equiv` $\rightarrow$ $\le$, $\ge$, `\ne`, $\approx$, $\equiv$
* **Calculus & Logic:** `\infty`, `\forall`, `\exists`, `\neg`, `\implies` $\rightarrow$ $\infty$, $\forall$, $\exists$, $\neg$, $\implies$
* **Operators:** `\pm`, `\times`, `\div`, `\cdot`, `\oplus` $\rightarrow$ $\pm$, $\times$, $\div$, $\cdot$, $\oplus$

---

## 7. Advanced Equation Formatting & Alignment

To present multi-line derivations with properly aligned equal signs (`=`), use the `aligned` block wrapped inside display math (`$$`). Use an ampersand (`&`) before the alignment anchor and a double backslash (`\\`) to start a new line.

### A. Left-aligned Derivation Example:
```markdown
$$
\begin{aligned}
(x + y)^2 &= (x + y)(x + y) \\
          &= x^2 + xy + yx + y^2 \\
          &= x^2 + 2xy + y^2
\end{aligned}
$$
```

#### Rendered In-App:
$$
\begin{aligned}
(x + y)^2 &= (x + y)(x + y) \\
          &= x^2 + xy + yx + y^2 \\
          &= x^2 + 2xy + y^2
\end{aligned}
$$

### B. Segmented Cases (Piecewise Functions):
Use the `cases` block to denote conditional criteria.
```markdown
$$
f(x) = 
\begin{cases} 
x^2 & \text{if } x < 0 \\
2x & \text{if } x \ge 0 
\end{cases}
$$
```

#### Rendered In-App:
$$
f(x) = 
\begin{cases} 
x^2 & \text{if } x < 0 \\
2x & \text{if } x \ge 0 
\end{cases}
$$

---

## 8. Best Practices for High-Stakes Assessments

1. **Avoid text inside math blocks without formatting:** Wrapping physical descriptions in standard formatting makes spacing cramped (e.g. `$x = 10 meters$` renders as $x = 10meters$). Always use `\text{...}` for descriptive letters inside math: `$x = 10 \text{ meters}$` renders as $x = 10 \text{ meters}$.
2. **Space out symbols:** Use `\,` (thin space), `\:` (medium space), or `\;` (thick space) to spread out equations if standard rendering binds elements too close.
3. **Escaping special characters:** If you want to render literal dollar signs or curly braces in a question alongside math, escape them: use `\$` for a regular dollar and `\{` / `\}` for brackets.
4. **Consistency**: Use standard variables (`x`, `y`, `z`) rather than words within equations to retain beautiful formatting.

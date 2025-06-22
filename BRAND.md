# 🎨 Dailies Brand Guidelines

> **Visual Identity and Design System for Dailies Content Curator**

---

## 📰 Brand Identity

### **Brand Name**
**Dailies** - Emphasizing the daily digest and routine nature of content consumption

### **Tagline**
**"Content Curator"** - Highlighting the intelligent curation and organization of content

### **Brand Personality**
- **Professional**: Trustworthy source for news and content
- **Intelligent**: AI-powered analysis and curation  
- **Minimalist**: Clean, distraction-free experience
- **Personal**: Self-hosted, privacy-focused approach
- **Efficient**: Streamlined content consumption

---

## 🎨 Visual Identity

### **Logo Concept**
- **Primary Symbol**: 📰 (Newspaper emoji) representing news and content
- **Badge Element**: Red "D" badge for brand recognition
- **Style**: Modern, flat design with subtle shadows

### **Logo Implementation**
```
📰 + [D] + "Dailies"
```
- Newspaper icon with red circular badge containing "D"
- Clean typography alongside the symbol
- Badge positioned top-right of main icon

---

## 🌈 Color Palette

### **Primary Colors**
```css
/* Blue Gradient (Primary Brand) */
--primary-blue-start: #2563eb    /* Bright blue */
--primary-blue-end: #1e40af      /* Deep blue */

/* Accent Colors */
--accent-red: #ef4444            /* Badge/notification red */
--accent-white: #ffffff          /* Clean backgrounds */
```

### **Supporting Colors**
```css
/* Grays (Text & UI) */
--gray-900: #1a1a1a             /* Primary text */
--gray-700: #374151             /* Secondary text */
--gray-500: #6b7280             /* Muted text */
--gray-300: #d1d5db             /* Borders */
--gray-100: #f3f4f6             /* Light backgrounds */

/* Status Colors */
--success-green: #10b981        /* Success states */
--warning-orange: #f59e0b       /* Warning states */
--error-red: #ef4444            /* Error states */
```

### **Color Usage**
- **Headers/Primary**: Blue gradient background
- **Text**: Gray-900 for primary, Gray-700 for secondary
- **Badges/Alerts**: Accent red for notifications
- **Success**: Green for completion states
- **Backgrounds**: White/Gray-100 for clean layouts

---

## 📝 Typography

### **Font Stack**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### **Typography Scale**
```css
/* Headings */
--font-size-h1: 28px;    /* Main brand name */
--font-size-h2: 24px;    /* Page headers */
--font-size-h3: 18px;    /* Section headers */

/* Body Text */
--font-size-body: 16px;  /* Standard body text */
--font-size-small: 14px; /* Secondary text */
--font-size-xs: 12px;    /* Captions/taglines */

/* Weights */
--font-weight-bold: 600;
--font-weight-medium: 500;
--font-weight-normal: 400;
```

### **Text Hierarchy**
1. **Brand Name**: 28px, Bold, White (on colored backgrounds)
2. **Taglines**: 12-16px, Normal, 80% opacity
3. **UI Labels**: 14px, Medium weight
4. **Body Text**: 16px, Normal weight
5. **Captions**: 12px, Normal, Muted color

---

## 🔤 Iconography

### **Icon Style**
- **Approach**: Emoji-based for accessibility and cross-platform consistency
- **Fallback**: Outline SVG icons for technical interfaces
- **Size**: 16px, 24px, 32px, 48px standard sizes

### **Content Type Icons**
```
📰 Articles/News
🎥 Videos (YouTube, Vimeo)
📺 Live Streams (Twitch)
🎵 Short Videos (TikTok)
🐦 Twitter/X Posts
💼 LinkedIn Posts
📱 Reddit Posts
📸 Instagram Posts
💬 Facebook Posts
📄 Generic Pages
```

### **UI Icons**
```
⚙️ Settings/Options
✓ Success/Completion
⚠ Warning/Attention
📊 Analytics/Stats
🔍 Search
📁 Folders/Categories
🔄 Refresh/Sync
```

---

## 📐 Layout & Spacing

### **Spacing Scale**
```css
--space-xs: 4px;     /* Tight spacing */
--space-sm: 8px;     /* Small gaps */
--space-md: 16px;    /* Standard spacing */
--space-lg: 24px;    /* Large sections */
--space-xl: 32px;    /* Major sections */
```

### **Layout Principles**
- **Container Max Width**: 600px for optimal readability
- **Padding**: 16-24px for comfortable touch targets
- **Border Radius**: 4-8px for modern, soft appearance
- **Shadows**: Subtle drop shadows (0 2px 4px rgba(0,0,0,0.1))

---

## 🎯 Component Styles

### **Buttons**
```css
/* Primary Button */
background: linear-gradient(135deg, #2563eb, #1e40af);
color: white;
padding: 12px 16px;
border-radius: 8px;
font-weight: 500;

/* Secondary Button */
background: white;
color: #2563eb;
border: 2px solid #2563eb;
```

### **Cards/Containers**
```css
background: white;
border-radius: 8px;
box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
border: 1px solid #e1e5e9;
```

### **Headers**
```css
background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
color: white;
padding: 16px-32px;
```

---

## 🔧 Implementation Guidelines

### **Extension Branding**
- **Popup Header**: Blue gradient with logo and tagline
- **Options Page**: Enhanced header with larger logo
- **Toast Notifications**: Brand colors with subtle animations
- **Context Menus**: Consistent "Dailies" branding

### **Web Interface Branding**
- **Dashboard Header**: Full brand treatment with navigation
- **Login/Auth Pages**: Centered brand logo and messaging
- **Email Templates**: Brand header with professional styling

### **API Documentation**
- **Swagger UI**: Custom theme with Dailies colors
- **Error Pages**: Branded 404/500 pages
- **Developer Portal**: Consistent visual identity

---

## 📱 Responsive Design

### **Breakpoints**
```css
--mobile: 480px;
--tablet: 768px;
--desktop: 1024px;
```

### **Extension Specific**
- **Popup**: Fixed 400px width, responsive height
- **Options**: Full responsive layout
- **Mobile Considerations**: Touch-friendly button sizes (44px min)

---

## ♿ Accessibility

### **Color Contrast**
- **Text on Blue**: White text on blue backgrounds (WCAG AA compliant)
- **Interactive Elements**: Minimum 3:1 contrast ratio
- **Focus States**: Visible focus rings for keyboard navigation

### **Icon Accessibility**
- **Alt Text**: Descriptive alt text for all icons
- **Screen Reader**: Semantic HTML structure
- **High Contrast**: Icons work in high contrast mode

---

## 📋 Brand Checklist

### **New Component Checklist**
- [ ] Uses approved color palette
- [ ] Follows typography scale
- [ ] Includes proper spacing
- [ ] Has accessible contrast ratios
- [ ] Works across different screen sizes
- [ ] Includes Dailies branding elements
- [ ] Maintains visual consistency

### **Release Checklist**
- [ ] All icons are properly sized and optimized
- [ ] Brand colors are consistent across components
- [ ] Typography follows established hierarchy
- [ ] Spacing adheres to design system
- [ ] Accessibility requirements met
- [ ] Cross-browser compatibility verified

---

## 🔄 Brand Evolution

### **Future Considerations**
- **Custom Logo**: Professional vector logo design
- **Extended Palette**: Additional accent colors for features
- **Animation**: Subtle micro-interactions and transitions
- **Dark Mode**: Complete dark theme implementation
- **International**: Multi-language typography considerations

### **Maintenance**
- **Regular Review**: Quarterly brand consistency audits
- **Documentation**: Keep brand guidelines updated
- **Training**: Ensure team follows brand standards
- **Feedback**: Collect user feedback on visual design

---

*Brand Guidelines v1.0*  
*Last Updated: June 21, 2025*  
*Next Review: September 21, 2025*
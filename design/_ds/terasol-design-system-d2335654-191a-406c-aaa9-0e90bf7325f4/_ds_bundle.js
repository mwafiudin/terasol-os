/* @ds-bundle: {"format":4,"namespace":"TerasolDesignSystem_d23356","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"IconCircle","sourcePath":"components/core/IconCircle.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FieldGroup","sourcePath":"components/forms/FieldGroup.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"Hero","sourcePath":"components/patterns/Hero.jsx"},{"name":"ProductCard","sourcePath":"components/patterns/ProductCard.jsx"},{"name":"ProgrammeCard","sourcePath":"components/patterns/ProgrammeCard.jsx"},{"name":"SectionHeading","sourcePath":"components/patterns/SectionHeading.jsx"},{"name":"SessionCard","sourcePath":"components/patterns/SessionCard.jsx"},{"name":"StatBlock","sourcePath":"components/patterns/StatBlock.jsx"},{"name":"TestimonialCard","sourcePath":"components/patterns/TestimonialCard.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"b7d28b6fd71d","components/core/Button.jsx":"2d03cb0ee4e7","components/core/Card.jsx":"ae7648e5a7ad","components/core/Divider.jsx":"2ce8c0e18caf","components/core/IconButton.jsx":"d5dae4854ba0","components/core/IconCircle.jsx":"018c869ad2c2","components/core/Logo.jsx":"b4d9f96ba09a","components/core/Tag.jsx":"ef7f9afa1187","components/feedback/Alert.jsx":"2b464c87ae63","components/feedback/Dialog.jsx":"d389ddb297ce","components/feedback/EmptyState.jsx":"85420cf7a76e","components/feedback/ProgressBar.jsx":"8b5404e640b5","components/feedback/Toast.jsx":"a5ee811f1b70","components/feedback/Tooltip.jsx":"6c8b965dc105","components/forms/Checkbox.jsx":"ba000b768358","components/forms/FieldGroup.jsx":"b5211ea8a8a9","components/forms/Input.jsx":"1b52172d453b","components/forms/Radio.jsx":"53ff7e9a4051","components/forms/Select.jsx":"ce77a6c2ff80","components/forms/Switch.jsx":"e10dba3956e0","components/navigation/Breadcrumb.jsx":"2cf1ae8d598e","components/navigation/NavBar.jsx":"4ab14f6963a2","components/navigation/Pagination.jsx":"990ab8fa98c8","components/navigation/TabBar.jsx":"69f5963fa26a","components/patterns/Hero.jsx":"d1cd482ad49f","components/patterns/ProductCard.jsx":"d631bf46fed5","components/patterns/ProgrammeCard.jsx":"e2a740cfa4e4","components/patterns/SectionHeading.jsx":"01535725a8a4","components/patterns/SessionCard.jsx":"b396f0221d8e","components/patterns/StatBlock.jsx":"9773208f24a9","components/patterns/TestimonialCard.jsx":"b81c01913e8e","ui_kits/member-app/AppHomeScreen.jsx":"7becedc902dc","ui_kits/member-app/ProgressScreen.jsx":"b3dee35b32b2","ui_kits/member-app/ScheduleScreen.jsx":"a779998ce263","ui_kits/member-app/SessionScreen.jsx":"84eb92463fb5","ui_kits/website/BookingScreen.jsx":"17762bbde7a8","ui_kits/website/Footer.jsx":"fe80bff06c10","ui_kits/website/HomeScreen.jsx":"3e0a18d9ff5d","ui_kits/website/ProductScreen.jsx":"9194616e1708","ui_kits/website/ProgrammesScreen.jsx":"d7d7fe5998e6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TerasolDesignSystem_d23356 = window.TerasolDesignSystem_d23356 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  brand: {
    background: 'var(--brand-soft)',
    color: 'var(--teal-900)'
  },
  accent: {
    background: 'var(--gold-100)',
    color: 'var(--gold-800)'
  },
  sage: {
    background: 'var(--sage-100)',
    color: 'var(--sage-900)'
  },
  success: {
    background: 'var(--success-100)',
    color: 'var(--success-700)'
  },
  warning: {
    background: 'var(--warning-100)',
    color: 'var(--warning-700)'
  },
  danger: {
    background: 'var(--danger-100)',
    color: 'var(--danger-700)'
  },
  info: {
    background: 'var(--info-100)',
    color: 'var(--info-700)'
  },
  onBrand: {
    background: 'rgba(255,255,255,.14)',
    color: 'var(--ivory-050)'
  }
};
function Badge({
  children,
  tone = 'brand',
  dot = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '5px var(--space-4)',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-label)',
      lineHeight: 1.3,
      ...tones[tone],
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--fw-semibold)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-3)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-control)',
  cursor: 'pointer',
  transition: 'var(--transition-control)',
  textDecoration: 'none',
  letterSpacing: 'var(--ls-label)',
  whiteSpace: 'nowrap'
};
const sizes = {
  sm: {
    minHeight: 40,
    padding: '0 var(--space-5)',
    fontSize: 'var(--text-sm)'
  },
  md: {
    minHeight: 'var(--tap-min)',
    padding: '0 var(--space-7)',
    fontSize: 'var(--text-md)'
  },
  lg: {
    minHeight: 58,
    padding: '0 var(--space-8)',
    fontSize: 'var(--text-lg)'
  }
};
const variants = {
  primary: {
    rest: {
      background: 'var(--teal-700)',
      color: 'var(--text-on-brand)',
      boxShadow: 'var(--shadow-inset)'
    },
    hover: {
      background: 'var(--teal-800)',
      boxShadow: 'var(--shadow-inset), var(--shadow-brand-glow)'
    }
  },
  accent: {
    rest: {
      background: 'var(--gold-500)',
      color: 'var(--teal-950)',
      boxShadow: 'var(--shadow-inset)'
    },
    hover: {
      background: 'var(--gold-600)',
      boxShadow: 'var(--shadow-inset), var(--shadow-md)'
    }
  },
  secondary: {
    rest: {
      background: 'transparent',
      color: 'var(--teal-700)',
      borderColor: 'var(--border-default)'
    },
    hover: {
      background: 'var(--brand-tint)',
      borderColor: 'var(--teal-700)'
    }
  },
  ghost: {
    rest: {
      background: 'transparent',
      color: 'var(--teal-700)'
    },
    hover: {
      background: 'var(--brand-tint)'
    }
  },
  onBrand: {
    rest: {
      background: 'var(--ivory-050)',
      color: 'var(--teal-900)'
    },
    hover: {
      background: 'var(--white)',
      boxShadow: 'var(--shadow-md)'
    }
  }
};
const disabledStyle = {
  background: 'var(--sage-100)',
  color: 'var(--text-subtle)',
  borderColor: 'transparent',
  boxShadow: 'none',
  cursor: 'not-allowed'
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  as = 'button',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const v = variants[variant] || variants.primary;
  const Tag = as;
  const composed = {
    ...base,
    ...sizes[size],
    ...v.rest,
    ...(hover && !disabled ? v.hover : null),
    ...(press && !disabled ? {
      transform: 'translateY(1px)'
    } : null),
    ...(disabled ? disabledStyle : null),
    ...(fullWidth ? {
      width: '100%'
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: composed,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const pads = {
  sm: 'var(--space-5)',
  md: 'var(--gutter-card)',
  lg: 'var(--gutter-card-lg)'
};
const variants = {
  default: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-sm)'
  },
  feature: {
    background: 'var(--surface-card)',
    border: 'none',
    borderRadius: 'var(--radius-card-lg)',
    boxShadow: 'var(--shadow-md)'
  },
  quiet: {
    background: 'var(--surface-sunken)',
    border: 'none',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'none'
  },
  brand: {
    background: 'var(--gradient-sanctuary)',
    border: 'none',
    borderRadius: 'var(--radius-card-lg)',
    boxShadow: 'var(--shadow-brand-glow)',
    color: 'var(--text-on-brand)'
  }
};
function Card({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      padding: pads[padding],
      transition: 'var(--transition-surface)',
      ...variants[variant],
      ...(interactive ? {
        cursor: 'pointer'
      } : null),
      ...(interactive && hover ? {
        transform: 'translateY(-2px)',
        boxShadow: 'var(--shadow-md)'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Divider({
  tone = 'hairline',
  inset = false,
  vertical = false,
  style,
  ...rest
}) {
  const color = tone === 'accent' ? 'var(--gold-400)' : tone === 'strong' ? 'var(--border-strong)' : 'var(--border-hairline)';
  if (vertical) {
    return /*#__PURE__*/React.createElement("div", _extends({
      role: "separator",
      "aria-orientation": "vertical",
      style: {
        width: 1,
        alignSelf: 'stretch',
        background: color,
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("hr", _extends({
    style: {
      border: 0,
      borderTop: `1px solid ${color}`,
      margin: 0,
      marginInline: inset ? 'var(--gutter-card)' : 0,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  quiet: {
    rest: {
      background: 'transparent',
      color: 'var(--teal-700)',
      borderColor: 'transparent'
    },
    hover: {
      background: 'var(--brand-tint)'
    }
  },
  outline: {
    rest: {
      background: 'var(--white)',
      color: 'var(--teal-700)',
      borderColor: 'var(--border-hairline)'
    },
    hover: {
      background: 'var(--brand-tint)',
      borderColor: 'var(--teal-700)'
    }
  },
  filled: {
    rest: {
      background: 'var(--teal-700)',
      color: 'var(--ivory-050)',
      borderColor: 'transparent'
    },
    hover: {
      background: 'var(--teal-800)'
    }
  },
  onBrand: {
    rest: {
      background: 'rgba(255,255,255,.12)',
      color: 'var(--ivory-050)',
      borderColor: 'transparent'
    },
    hover: {
      background: 'rgba(255,255,255,.2)'
    }
  }
};
const dims = {
  sm: 40,
  md: 48,
  lg: 56
};
function IconButton({
  children,
  label,
  tone = 'quiet',
  size = 'md',
  disabled = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const t = tones[tone] || tones.quiet;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: dims[size],
      height: dims[size],
      display: 'inline-grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-circle)',
      border: '1px solid transparent',
      cursor: 'pointer',
      transition: 'var(--transition-control)',
      ...t.rest,
      ...(hover && !disabled ? t.hover : null),
      ...(disabled ? {
        background: 'var(--sage-100)',
        color: 'var(--text-subtle)',
        cursor: 'not-allowed'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/IconCircle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  brand: {
    background: 'var(--brand-soft)',
    color: 'var(--teal-800)'
  },
  accent: {
    background: 'var(--gold-100)',
    color: 'var(--gold-700)'
  },
  sage: {
    background: 'var(--sage-100)',
    color: 'var(--sage-800)'
  },
  onBrand: {
    background: 'rgba(255,255,255,.12)',
    color: 'var(--ivory-050)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--teal-700)',
    border: '1px solid var(--border-default)'
  }
};
function IconCircle({
  children,
  tone = 'brand',
  size = 56,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-circle)',
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconCircle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconCircle.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SRC = {
  'mark': 'terasol-mark.svg',
  'mark-white': 'terasol-mark-white.svg',
  'mark-teal': 'terasol-mark-teal.svg',
  'mark-ivory': 'terasol-mark-ivory.svg',
  'lockup': 'terasol-lockup.png',
  'lockup-white': 'terasol-lockup-white.png'
};
function Logo({
  variant = 'lockup',
  height = 56,
  basePath = 'assets',
  style,
  ...rest
}) {
  const isMark = variant.startsWith('mark');
  return /*#__PURE__*/React.createElement("img", _extends({
    src: `${basePath}/${SRC[variant] || SRC.lockup}`,
    alt: "Rumah Sehat Terasol",
    style: {
      height,
      width: isMark ? height : 'auto',
      minWidth: isMark ? 32 : 180,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  selected = false,
  onClick,
  iconLeft,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = typeof onClick === 'function';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    "aria-pressed": interactive ? selected : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      minHeight: 40,
      padding: '0 var(--space-5)',
      borderRadius: 'var(--radius-chip)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--fw-medium)',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'var(--transition-control)',
      background: selected ? 'var(--brand-soft)' : hover && interactive ? 'var(--brand-tint)' : 'var(--white)',
      color: selected ? 'var(--teal-900)' : 'var(--text-body)',
      border: selected ? '2px solid var(--teal-700)' : '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), iconLeft, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  info: {
    bg: 'var(--info-100)',
    fg: 'var(--info-700)',
    icon: 'info'
  },
  success: {
    bg: 'var(--success-100)',
    fg: 'var(--success-700)',
    icon: 'check-circle-2'
  },
  warning: {
    bg: 'var(--warning-100)',
    fg: 'var(--warning-700)',
    icon: 'alert-triangle'
  },
  danger: {
    bg: 'var(--danger-100)',
    fg: 'var(--danger-700)',
    icon: 'alert-circle'
  },
  brand: {
    bg: 'var(--brand-soft)',
    fg: 'var(--teal-900)',
    icon: 'heart-handshake'
  }
};
function Alert({
  tone = 'info',
  title,
  children,
  onDismiss,
  action,
  style,
  ...rest
}) {
  const t = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: tone === 'danger' ? 'alert' : 'status',
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
      background: t.bg,
      borderRadius: 'var(--radius-card)',
      padding: 'var(--space-5) var(--space-6)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: t.fg,
      display: 'grid',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": t.icon
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: t.fg,
      lineHeight: 'var(--lh-snug)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, action)), onDismiss && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Tutup pesan",
    tone: "quiet",
    size: "sm",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x"
  })));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  width = 560,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 80,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--surface-overlay)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      padding: 'var(--space-6)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card-lg)',
      boxShadow: 'var(--shadow-xl)',
      padding: 'var(--gutter-card-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d3)',
      fontWeight: 'var(--fw-regular)',
      color: 'var(--text-heading)',
      lineHeight: 'var(--lh-snug)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, description)), onClose && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Tutup",
    tone: "quiet",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x"
  }))), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EmptyState({
  icon,
  title,
  description,
  action,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      justifyItems: 'center',
      textAlign: 'center',
      gap: 'var(--space-5)',
      padding: 'var(--space-10) var(--space-6)',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.IconCircle, {
    tone: "sage",
    size: 72
  }, icon), title && /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--text-muted)',
      maxWidth: '38ch',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, description), action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressBar({
  value = 0,
  max = 100,
  label,
  caption,
  tone = 'brand',
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const fill = tone === 'accent' ? 'var(--gold-500)' : tone === 'success' ? 'var(--success-500)' : 'var(--teal-700)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), (label || caption) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      alignItems: 'baseline'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--teal-900)'
    }
  }, label), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, caption)), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    style: {
      height: 10,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--sage-200)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--radius-pill)',
      background: fill,
      transition: 'width var(--dur-slow) var(--ease-calm)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const icons = {
  info: 'info',
  success: 'check-circle-2',
  warning: 'alert-triangle',
  danger: 'alert-circle'
};
function Toast({
  tone = 'success',
  message,
  onDismiss,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      background: 'var(--teal-900)',
      color: 'var(--ivory-050)',
      borderRadius: 'var(--radius-pill)',
      padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-6)',
      boxShadow: 'var(--shadow-lg)',
      maxWidth: 520,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'grid',
      color: tone === 'danger' ? 'var(--danger-500)' : 'var(--gold-400)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icons[tone]
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      flex: 1,
      lineHeight: 'var(--lh-normal)'
    }
  }, message), onDismiss && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Tutup",
    tone: "onBrand",
    size: "sm",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x"
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tooltip({
  label,
  children,
  placement = 'top',
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === 'bottom' ? {
    top: 'calc(100% + 10px)',
    left: '50%',
    transform: 'translateX(-50%)'
  } : {
    bottom: 'calc(100% + 10px)',
    left: '50%',
    transform: 'translateX(-50%)'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      ...pos,
      zIndex: 60,
      pointerEvents: 'none',
      background: 'var(--teal-900)',
      color: 'var(--ivory-050)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--lh-normal)',
      padding: 'var(--space-2) var(--space-4)',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-md)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-fast) var(--ease-calm)'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  description,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
      minHeight: 'var(--tap-min)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 26,
      height: 26,
      flex: '0 0 26px',
      marginTop: 3,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-xs)',
      transition: 'var(--transition-control)',
      background: disabled ? 'var(--sage-100)' : checked ? 'var(--teal-700)' : 'var(--white)',
      border: checked ? '2px solid var(--teal-700)' : '1px solid var(--border-strong)',
      color: 'var(--ivory-050)'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: disabled ? 'var(--text-subtle)' : 'var(--text-body)',
      lineHeight: 'var(--lh-normal)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FieldGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FieldGroup({
  label,
  hint,
  error,
  htmlFor,
  required = false,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--teal-900)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--gold-700)',
      marginLeft: 4
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--danger-700)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { FieldGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FieldGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const fieldBase = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  color: 'var(--text-body)',
  background: 'var(--white)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-field)',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-4)',
  width: '100%',
  transition: 'var(--transition-control)',
  lineHeight: 'var(--lh-normal)'
};
function Input({
  invalid = false,
  disabled = false,
  iconLeft,
  as = 'input',
  rows,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const control = /*#__PURE__*/React.createElement(Tag, _extends({
    rows: Tag === 'textarea' ? rows || 4 : undefined,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...fieldBase,
      ...(Tag === 'textarea' ? {
        padding: 'var(--space-4)',
        minHeight: 120,
        resize: 'vertical',
        fontFamily: 'var(--font-body)'
      } : null),
      ...(iconLeft ? {
        paddingLeft: 'var(--space-11)'
      } : null),
      ...(invalid ? {
        borderColor: 'var(--danger-500)'
      } : null),
      ...(focus ? {
        borderColor: 'var(--teal-700)',
        boxShadow: 'var(--shadow-focus)',
        outline: 'none'
      } : null),
      ...(disabled ? {
        background: 'var(--sage-100)',
        color: 'var(--text-subtle)',
        cursor: 'not-allowed'
      } : null),
      ...style
    }
  }, rest));
  if (!iconLeft) return control;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 'var(--space-4)',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-muted)',
      display: 'grid',
      pointerEvents: 'none'
    }
  }, iconLeft), control);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  description,
  checked = false,
  onChange,
  name,
  value,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
      minHeight: 'var(--tap-min)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 26,
      height: 26,
      flex: '0 0 26px',
      marginTop: 3,
      display: 'grid',
      placeItems: 'center',
      borderRadius: '50%',
      transition: 'var(--transition-control)',
      background: disabled ? 'var(--sage-100)' : 'var(--white)',
      border: checked ? '2px solid var(--teal-700)' : '1px solid var(--border-strong)'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: 'var(--teal-700)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: disabled ? 'var(--text-subtle)' : 'var(--text-body)',
      lineHeight: 'var(--lh-normal)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, description)));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const fieldBase = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  color: 'var(--text-body)',
  background: 'var(--white)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-field)',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-4)',
  width: '100%',
  transition: 'var(--transition-control)',
  lineHeight: 'var(--lh-normal)'
};
function Select({
  options = [],
  disabled = false,
  invalid = false,
  placeholder,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...fieldBase,
      appearance: 'none',
      paddingRight: 'var(--space-10)',
      cursor: 'pointer',
      ...(invalid ? {
        borderColor: 'var(--danger-500)'
      } : null),
      ...(focus ? {
        borderColor: 'var(--teal-700)',
        boxShadow: 'var(--shadow-focus)',
        outline: 'none'
      } : null),
      ...(disabled ? {
        background: 'var(--sage-100)',
        color: 'var(--text-subtle)',
        cursor: 'not-allowed'
      } : null),
      ...style
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const value = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, label);
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 'var(--space-4)',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--teal-700)',
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-down"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 'var(--space-5)',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 'var(--tap-min)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: disabled ? 'var(--text-subtle)' : 'var(--text-body)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, description)), /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 56,
      height: 32,
      flex: '0 0 56px',
      borderRadius: 'var(--radius-pill)',
      padding: 3,
      transition: 'var(--transition-control)',
      display: 'flex',
      alignItems: 'center',
      background: disabled ? 'var(--sage-200)' : checked ? 'var(--teal-700)' : 'var(--sage-300)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'transform var(--dur-fast) var(--ease-calm)',
      transform: checked ? 'translateX(24px)' : 'translateX(0)'
    }
  })));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Breadcrumb({
  items = [],
  onNavigate,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Breadcrumb",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      flexWrap: 'wrap',
      ...style
    }
  }, rest), items.map((it, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: it.id || it.label
    }, last ? /*#__PURE__*/React.createElement("span", {
      "aria-current": "page",
      style: {
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)'
      }
    }, it.label) : /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNavigate && onNavigate(it.id);
      },
      style: {
        fontSize: 'var(--text-sm)',
        color: 'var(--text-link)',
        textDecoration: 'none'
      }
    }, it.label), !last && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        color: 'var(--sage-400)'
      }
    }, "\xB7"));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavBar({
  items = [],
  activeItem,
  onNavigate,
  cta,
  basePath = 'assets',
  sticky = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: sticky ? 'sticky' : 'static',
      top: 0,
      zIndex: 40,
      background: 'rgba(248,245,238,.88)',
      backdropFilter: 'var(--blur-veil)',
      WebkitBackdropFilter: 'var(--blur-veil)',
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: '0 var(--page-pad)',
      height: 88,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate && onNavigate(items[0] && items[0].id);
    },
    style: {
      display: 'grid',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "lockup",
    height: 46,
    basePath: basePath
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'var(--space-7)',
      marginLeft: 'auto',
      alignItems: 'center'
    }
  }, items.map(it => {
    const active = it.id === activeItem;
    return /*#__PURE__*/React.createElement("a", {
      key: it.id,
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNavigate && onNavigate(it.id);
      },
      "aria-current": active ? 'page' : undefined,
      style: {
        fontSize: 'var(--text-md)',
        fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-regular)',
        color: active ? 'var(--teal-900)' : 'var(--text-body)',
        textDecoration: 'none',
        paddingBottom: 4,
        borderBottom: active ? '3px solid var(--gold-500)' : '3px solid transparent',
        transition: 'var(--transition-control)'
      }
    }, it.label);
  })), cta && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto'
    }
  }, cta)));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Pagination({
  page = 1,
  total = 1,
  onChange,
  style,
  ...rest
}) {
  const go = n => {
    if (n >= 1 && n <= total && onChange) onChange(n);
  };
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Halaman",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Halaman sebelumnya",
    tone: "outline",
    onClick: () => go(page - 1),
    disabled: page <= 1
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-left"
  })), Array.from({
    length: total
  }, (_, i) => i + 1).map(n => {
    const active = n === page;
    return /*#__PURE__*/React.createElement("button", {
      key: n,
      type: "button",
      onClick: () => go(n),
      "aria-current": active ? 'page' : undefined,
      style: {
        minWidth: 48,
        minHeight: 48,
        borderRadius: 'var(--radius-circle)',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-md)',
        fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-regular)',
        background: active ? 'var(--brand-soft)' : 'transparent',
        color: active ? 'var(--teal-900)' : 'var(--text-body)',
        border: active ? '2px solid var(--teal-700)' : '1px solid transparent',
        transition: 'var(--transition-control)'
      }
    }, n);
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    label: "Halaman berikutnya",
    tone: "outline",
    onClick: () => go(page + 1),
    disabled: page >= total
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-right"
  })));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TabBar({
  items = [],
  activeItem,
  onSelect,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      background: 'var(--white)',
      borderTop: '1px solid var(--border-hairline)',
      paddingBottom: 'var(--space-2)',
      ...style
    }
  }, rest), items.map(it => {
    const active = it.id === activeItem;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onSelect && onSelect(it.id),
      "aria-current": active ? 'page' : undefined,
      style: {
        flex: 1,
        minHeight: 64,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'grid',
        justifyItems: 'center',
        gap: 4,
        padding: 'var(--space-3) 0',
        color: active ? 'var(--teal-800)' : 'var(--text-muted)',
        transition: 'var(--transition-control)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'grid'
      }
    }, it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: active ? 'var(--fw-semibold)' : 'var(--fw-regular)'
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/patterns/Hero.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Hero({
  eyebrow,
  title,
  description,
  actions,
  art = 'brand-art-wave-layers.jpg',
  basePath = 'assets',
  note,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--ivory-100)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("img", {
    src: `${basePath}/${art}`,
    alt: "",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'right bottom',
      opacity: .9
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-13) var(--page-pad) var(--space-13)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 620,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      fontWeight: 'var(--fw-medium)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-accent)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-hero)',
      fontWeight: 'var(--fw-light)',
      lineHeight: 'var(--lh-tight)',
      letterSpacing: 'var(--ls-display)',
      color: 'var(--teal-900)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--text-body)',
      maxWidth: '46ch'
    }
  }, description), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      flexWrap: 'wrap',
      marginTop: 'var(--space-2)'
    }
  }, actions), note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, note))));
}
Object.assign(__ds_scope, { Hero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/Hero.jsx", error: String((e && e.message) || e) }); }

// components/patterns/ProductCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProductCard({
  image,
  basePath = 'assets',
  name,
  kind,
  description,
  price,
  badge,
  onSelect,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    padding: "sm",
    interactive: !!onSelect,
    onClick: onSelect,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ivory-050)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-6)',
      display: 'grid',
      placeItems: 'center',
      position: 'relative'
    }
  }, badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 'var(--space-3)',
      left: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "accent"
  }, badge)), /*#__PURE__*/React.createElement("img", {
    src: `${basePath}/${image}`,
    alt: name,
    style: {
      maxHeight: 180,
      width: 'auto',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      padding: '0 var(--space-2)'
    }
  }, kind && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-accent)'
    }
  }, kind), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)'
    }
  }, name), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, description)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: '0 var(--space-2) var(--space-2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, price && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--teal-800)'
    }
  }, price), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm"
  }, "Lihat produk")));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/patterns/ProgrammeCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgrammeCard({
  title,
  meta = [],
  description,
  price,
  action,
  onSelect,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    interactive: !!onSelect,
    onClick: onSelect,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 40,
      height: 2,
      background: 'var(--gold-500)'
    }
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)',
      lineHeight: 'var(--lh-snug)'
    }
  }, title), meta.length > 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      letterSpacing: 'var(--ls-label)'
    }
  }, meta.join(' · ')), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--text-body)'
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 'var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, price && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-800)'
    }
  }, price), action || onSelect && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm"
  }, "Lihat detail")));
}
Object.assign(__ds_scope, { ProgrammeCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/ProgrammeCard.jsx", error: String((e && e.message) || e) }); }

// components/patterns/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  onBrand = false,
  action,
  style,
  ...rest
}) {
  const centred = align === 'center';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      alignItems: centred ? 'center' : 'flex-start',
      textAlign: centred ? 'center' : 'left',
      maxWidth: centred ? 720 : undefined,
      marginInline: centred ? 'auto' : undefined,
      ...style
    }
  }, rest), eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      fontWeight: 'var(--fw-medium)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: onBrand ? 'var(--gold-400)' : 'var(--text-accent)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 48,
      height: 2,
      background: onBrand ? 'var(--gold-400)' : 'var(--gold-500)'
    }
  }), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d2)',
      fontWeight: 'var(--fw-light)',
      lineHeight: 'var(--lh-snug)',
      color: onBrand ? 'var(--ivory-050)' : 'var(--text-heading)',
      maxWidth: '22ch'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--lh-relaxed)',
      color: onBrand ? 'var(--teal-200)' : 'var(--text-muted)',
      maxWidth: 'var(--measure-body)'
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, action));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/patterns/SessionCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const statusTone = {
  terjadwal: 'success',
  menunggu: 'warning',
  selesai: 'sage',
  dibatalkan: 'danger'
};
function SessionCard({
  day,
  date,
  time,
  title,
  therapist,
  status = 'terjadwal',
  action,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    padding: "sm",
    style: {
      display: 'flex',
      gap: 'var(--space-5)',
      alignItems: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.IconCircle, {
    tone: "brand",
    size: 64,
    style: {
      flexDirection: 'column',
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase'
    }
  }, day), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)'
    }
  }, date)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--teal-900)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, [time, therapist].filter(Boolean).join(' · '))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: statusTone[status] || 'sage',
    dot: true
  }, status), action));
}
Object.assign(__ds_scope, { SessionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/SessionCard.jsx", error: String((e && e.message) || e) }); }

// components/patterns/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StatBlock({
  value,
  label,
  onBrand = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d2)',
      fontWeight: 'var(--fw-light)',
      lineHeight: 1,
      color: onBrand ? 'var(--ivory-050)' : 'var(--teal-800)'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 32,
      height: 2,
      background: 'var(--gold-500)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--lh-normal)',
      color: onBrand ? 'var(--teal-200)' : 'var(--text-muted)',
      maxWidth: '20ch'
    }
  }, label));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/patterns/TestimonialCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TestimonialCard({
  quote,
  name,
  detail,
  onBrand = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    variant: onBrand ? 'brand' : 'feature',
    padding: "lg",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 48,
      lineHeight: .6,
      color: onBrand ? 'var(--gold-400)' : 'var(--gold-500)'
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-light)',
      lineHeight: 'var(--lh-normal)',
      color: onBrand ? 'var(--ivory-050)' : 'var(--teal-900)'
    }
  }, quote), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--fw-semibold)',
      color: onBrand ? 'var(--ivory-050)' : 'var(--teal-900)'
    }
  }, name), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: onBrand ? 'var(--teal-200)' : 'var(--text-muted)'
    }
  }, detail)));
}
Object.assign(__ds_scope, { TestimonialCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/patterns/TestimonialCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/member-app/AppHomeScreen.jsx
try { (() => {
const {
  Card,
  Button,
  Badge,
  SessionCard,
  ProgressBar,
  IconCircle,
  Divider,
  Logo,
  Alert
} = window.TerasolDesignSystem_d23356;
function AppHomeScreen({
  onNavigate,
  onToast
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "Selamat pagi,"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d3)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Ibu Sari")), /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    height: 44,
    basePath: "../../assets"
  })), /*#__PURE__*/React.createElement(Card, {
    variant: "brand",
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "onBrand",
    dot: true
  }, "Sesi berikutnya"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--teal-200)'
    }
  }, "Kelapa Gading")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d2)',
      fontWeight: 'var(--fw-light)',
      color: 'var(--ivory-050)',
      lineHeight: 1.1
    }
  }, "Senin, 10.00"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--teal-200)'
    }
  }, "Terapi Terahertz \xB7 40 menit \xB7 Terapis Rini")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "onBrand",
    onClick: () => onNavigate('sesi')
  }, "Lihat detail sesi"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    style: {
      color: 'var(--teal-100)'
    },
    onClick: () => onToast('Kami kirim pengingat sehari sebelumnya.')
  }, "Ingatkan saya"))), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 5,
    max: 8,
    label: "Program Kaki Ringan",
    caption: "5 dari 8 sesi"
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, [['40 menit', 'Durasi sesi'], ['3 sesi', 'Tersisa'], ['12 Okt', 'Perkiraan selesai']].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-800)'
    }
  }, v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Jadwal minggu ini"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => onNavigate('jadwal')
  }, "Semua jadwal")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(SessionCard, {
    day: "Sen",
    date: "08",
    time: "10.00",
    title: "Terapi Terahertz",
    therapist: "Terapis Rini",
    status: "terjadwal"
  }), /*#__PURE__*/React.createElement(SessionCard, {
    day: "Kam",
    date: "11",
    time: "14.00",
    title: "Terapi Terahertz",
    therapist: "Terapis Dedi",
    status: "menunggu"
  }))), /*#__PURE__*/React.createElement(Alert, {
    tone: "brand",
    title: "Stok FITSOL CN Anda tinggal sedikit",
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => onToast('Kami siapkan saat kunjungan Senin.')
    }, "Siapkan saat kunjungan")
  }, "Berdasarkan pembelian terakhir pada 12 Agustus."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-3)'
    }
  }, [['messages-square', 'Tanya terapis'], ['map-pin', 'Lokasi cabang']].map(([icon, label]) => /*#__PURE__*/React.createElement(Card, {
    key: label,
    padding: "sm",
    interactive: true,
    onClick: () => onToast('Fitur ini belum tersedia di prototipe.'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "sage",
    size: 40
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)'
    }
  }, label)))));
}
Object.assign(window, {
  AppHomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/member-app/AppHomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/member-app/ProgressScreen.jsx
try { (() => {
const {
  Card,
  Button,
  Badge,
  ProgressBar,
  Divider,
  StatBlock,
  IconCircle,
  Switch,
  TestimonialCard
} = window.TerasolDesignSystem_d23356;
const WEEKS = [{
  label: 'Ags · pekan 1',
  value: 2
}, {
  label: 'Ags · pekan 2',
  value: 3
}, {
  label: 'Ags · pekan 3',
  value: 3
}, {
  label: 'Ags · pekan 4',
  value: 4
}, {
  label: 'Sep · pekan 1',
  value: 5
}];
function ProgressScreen({
  onToast
}) {
  const [remind, setRemind] = React.useState(true);
  const max = 6;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d3)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Progres"), /*#__PURE__*/React.createElement(Card, {
    variant: "feature",
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Program Kaki Ringan"), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, "Sesi 5 / 8")), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 5,
    max: 8,
    caption: "Perkiraan selesai 12 Oktober"
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "Catatan terapis: rasa hangat bertahan lebih lama"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 'var(--space-3)',
      height: 120,
      marginTop: 'var(--space-4)'
    }
  }, WEEKS.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.label,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: `${w.value / max * 88}px`,
      background: 'var(--teal-600)',
      borderRadius: 'var(--radius-sm) var(--radius-sm) 2px 2px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      textAlign: 'center',
      lineHeight: 1.3
    }
  }, w.label)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "sm"
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "14 sesi",
    label: "Sesi yang sudah Anda jalani"
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "sm"
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "9 bulan",
    label: "Bergabung sejak Desember"
  }))), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Pengaturan pengingat"), /*#__PURE__*/React.createElement(Switch, {
    label: "Pengingat sesi",
    description: "Kami kirim sehari sebelum sesi.",
    checked: remind,
    onChange: () => {
      setRemind(!remind);
      onToast(remind ? 'Pengingat dimatikan.' : 'Pengingat dinyalakan.');
    }
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "accent",
    size: 40
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "download"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)'
    }
  }, "Ringkasan untuk dokter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "Catatan sesi dalam satu halaman")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onToast('Ringkasan dikirim ke WhatsApp Anda.')
  }, "Kirim"))), /*#__PURE__*/React.createElement(TestimonialCard, {
    onBrand: true,
    quote: "Kaki saya tidak lagi terasa dingin setiap pagi.",
    name: "Catatan Anda, 2 September",
    detail: "Ditulis setelah sesi ke-4"
  }));
}
Object.assign(window, {
  ProgressScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/member-app/ProgressScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/member-app/ScheduleScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Card,
  Button,
  SessionCard,
  Tag,
  EmptyState,
  Dialog,
  Divider,
  IconButton
} = window.TerasolDesignSystem_d23356;
const UPCOMING = [{
  day: 'Sen',
  date: '08',
  time: '10.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Rini',
  status: 'terjadwal'
}, {
  day: 'Kam',
  date: '11',
  time: '14.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Dedi',
  status: 'menunggu'
}, {
  day: 'Sen',
  date: '15',
  time: '10.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Rini',
  status: 'terjadwal'
}];
const PAST = [{
  day: 'Kam',
  date: '04',
  time: '10.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Rini',
  status: 'selesai'
}, {
  day: 'Sen',
  date: '01',
  time: '11.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Dedi',
  status: 'selesai'
}, {
  day: 'Kam',
  date: '28',
  time: '10.00',
  title: 'Terapi Terahertz',
  therapist: 'Terapis Rini',
  status: 'dibatalkan'
}];
function ScheduleScreen({
  onNavigate,
  onToast
}) {
  const [tab, setTab] = React.useState('akan');
  const [cancel, setCancel] = React.useState(null);
  const list = tab === 'akan' ? UPCOMING : PAST;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d3)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Jadwal"), /*#__PURE__*/React.createElement(IconButton, {
    label: "Tambah sesi",
    tone: "filled",
    onClick: () => onToast('Hubungi terapis untuk menambah sesi.')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    selected: tab === 'akan',
    onClick: () => setTab('akan')
  }, "Akan datang"), /*#__PURE__*/React.createElement(Tag, {
    selected: tab === 'riwayat',
    onClick: () => setTab('riwayat')
  }, "Riwayat")), list.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "calendar"
    }),
    title: "Belum ada sesi terjadwal",
    description: "Mari kami bantu memilih jadwal yang nyaman untuk Anda.",
    action: /*#__PURE__*/React.createElement(Button, null, "Jadwalkan sesi")
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, list.map((s, i) => /*#__PURE__*/React.createElement(SessionCard, _extends({
    key: i
  }, s, {
    action: s.status === 'terjadwal' || s.status === 'menunggu' ? /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setCancel(s)
    }, "Ubah") : /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => onNavigate('sesi')
    }, "Detail")
  })))), /*#__PURE__*/React.createElement(Card, {
    variant: "quiet",
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Perlu mengubah jadwal?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, "Perubahan bisa dilakukan sampai 3 jam sebelum sesi. Setelah itu, hubungi kami lewat WhatsApp."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "messages-square"
    })
  }, "Hubungi Terasol"))), /*#__PURE__*/React.createElement(Dialog, {
    open: !!cancel,
    width: 340,
    title: "Ubah atau batalkan sesi ini?",
    description: cancel ? `${cancel.day}, ${cancel.date} September pukul ${cancel.time}.` : '',
    onClose: () => setCancel(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setCancel(null)
    }, "Kembali"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => {
        setCancel(null);
        onToast('Permintaan perubahan terkirim.');
      }
    }, "Kirim permintaan"))
  }));
}
Object.assign(window, {
  ScheduleScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/member-app/ScheduleScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/member-app/SessionScreen.jsx
try { (() => {
const {
  Card,
  Button,
  Badge,
  Divider,
  IconCircle,
  Alert,
  Breadcrumb,
  ProgressBar
} = window.TerasolDesignSystem_d23356;
function SessionScreen({
  onNavigate,
  onToast
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: [{
      id: 'jadwal',
      label: 'Jadwal'
    }, {
      label: 'Senin, 8 September'
    }],
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "Terjadwal"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d2)',
      fontWeight: 'var(--fw-light)',
      color: 'var(--teal-900)',
      lineHeight: 1.15
    }
  }, "Terapi Terahertz"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-lg)',
      color: 'var(--text-muted)'
    }
  }, "Senin, 8 September \xB7 10.00 \xB7 40 menit")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ivory-050)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-6)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/product-terahertz-device.png",
    alt: "Alat terapi Terahertz",
    style: {
      width: '100%',
      maxWidth: 300
    }
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, [['user-round', 'Terapis Rini', 'Pendamping sesi Anda'], ['map-pin', 'Terasol Kelapa Gading', 'Jl. Boulevard Raya No. 12'], ['clock', 'Datang 10 menit lebih awal', 'Agar tidak tergesa saat mulai']].map(([icon, t, s]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "brand",
    size: 44
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--teal-900)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, s))))), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--teal-900)'
    }
  }, "Yang akan terjadi di sesi ini"), ['Terapis mengukur suhu kaki dan menanyakan keluhan hari ini.', 'Anda duduk santai, kaki diletakkan di alas hangat selama 40 menit.', 'Terapis menyesuaikan suhu bersama Anda, dan mencatat hasilnya.'].map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--gold-700)',
      flex: '0 0 20px'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, s))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 6,
    max: 8,
    label: "Sesi ke-6",
    caption: "Program Kaki Ringan"
  })), /*#__PURE__*/React.createElement(Alert, {
    tone: "brand"
  }, "Bila Anda merasa kurang nyaman, sesi bisa dihentikan kapan saja. Cukup katakan kepada terapis."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    style: {
      flex: 1
    },
    onClick: () => onToast('Kami kirim pengingat sehari sebelumnya.')
  }, "Ingatkan saya"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    style: {
      flex: 1
    },
    onClick: () => onNavigate('jadwal')
  }, "Ubah jadwal")));
}
Object.assign(window, {
  SessionScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/member-app/SessionScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/BookingScreen.jsx
try { (() => {
const {
  Breadcrumb,
  SectionHeading,
  Card,
  Button,
  FieldGroup,
  Input,
  Select,
  Radio,
  Checkbox,
  Alert,
  Divider,
  Badge,
  Dialog,
  IconCircle,
  ProgressBar
} = window.TerasolDesignSystem_d23356;
const SLOTS = ['09.00', '10.00', '11.00', '13.00', '14.00', '15.00'];
function BookingScreen({
  onNavigate,
  onToast
}) {
  const [step, setStep] = React.useState(1);
  const [slot, setSlot] = React.useState('10.00');
  const [durasi, setDurasi] = React.useState('40');
  const [consent, setConsent] = React.useState(true);
  const [confirm, setConfirm] = React.useState(false);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      position: 'relative',
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-9) var(--page-pad) var(--space-13)'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: [{
      id: 'home',
      label: 'Beranda'
    }, {
      label: 'Jadwalkan kunjungan'
    }],
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-7)',
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Kunjungan pertama",
    title: "Jadwalkan kunjungan Anda",
    description: "Isi tiga hal saja. Kami hubungi lewat WhatsApp untuk memastikan jadwalnya cocok."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 'var(--space-9)',
      marginTop: 'var(--space-9)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "feature",
    padding: "lg",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: step,
    max: 3,
    label: `Langkah ${step} dari 3`,
    caption: ['Identitas', 'Jadwal', 'Konfirmasi'][step - 1]
  }), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Nama lengkap",
    htmlFor: "nama",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    id: "nama",
    defaultValue: "Sari Wulandari"
  })), /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Usia",
    htmlFor: "usia"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "usia",
    defaultValue: "68"
  })), /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Nomor WhatsApp",
    htmlFor: "wa",
    hint: "Kami hanya menghubungi untuk konfirmasi jadwal.",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    id: "wa",
    defaultValue: "0812 3456 7890"
  })), /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Cabang",
    htmlFor: "cabang",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    id: "cabang",
    options: ['Terasol Kelapa Gading', 'Terasol Bintaro']
  })), /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Keluhan yang ingin Anda sampaikan",
    htmlFor: "keluhan",
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "keluhan",
    as: "textarea",
    rows: 3,
    placeholder: "Misalnya: kaki terasa dingin setiap pagi"
  }))), step === 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    label: "Tanggal kunjungan",
    htmlFor: "tgl"
  }, /*#__PURE__*/React.createElement(Select, {
    id: "tgl",
    options: ['Senin, 8 September', 'Selasa, 9 September', 'Kamis, 11 September']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--teal-900)'
    }
  }, "Pilih jam"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-3)'
    }
  }, SLOTS.map(s => {
    const on = s === slot;
    const full = s === '13.00';
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      disabled: full,
      onClick: () => setSlot(s),
      style: {
        minHeight: 'var(--tap-min)',
        borderRadius: 'var(--radius-pill)',
        cursor: full ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-md)',
        fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-regular)',
        background: full ? 'var(--sage-100)' : on ? 'var(--brand-soft)' : 'var(--white)',
        color: full ? 'var(--text-subtle)' : on ? 'var(--teal-900)' : 'var(--text-body)',
        border: on ? '2px solid var(--teal-700)' : '1px solid var(--border-hairline)',
        transition: 'var(--transition-control)'
      }
    }, s, full ? ' · penuh' : '');
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--teal-900)'
    }
  }, "Durasi sesi"), /*#__PURE__*/React.createElement(Radio, {
    name: "durasi",
    value: "40",
    label: "40 menit",
    description: "Sesi standar",
    checked: durasi === '40',
    onChange: () => setDurasi('40')
  }), /*#__PURE__*/React.createElement(Radio, {
    name: "durasi",
    value: "60",
    label: "60 menit",
    description: "Termasuk konsultasi awal",
    checked: durasi === '60',
    onChange: () => setDurasi('60')
  }))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "quiet",
    padding: "md",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-5)'
    }
  }, [['Nama', 'Ibu Sari Wulandari'], ['Cabang', 'Terasol Kelapa Gading'], ['Tanggal', 'Senin, 8 September'], ['Jam', `${slot} · ${durasi} menit`]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--teal-900)'
    }
  }, v)))), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Saya bersedia dihubungi lewat WhatsApp",
    description: "Hanya untuk konfirmasi jadwal. Kami tidak mengirim promosi.",
    checked: consent,
    onChange: () => setConsent(!consent)
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "brand"
  }, "Kunjungan pertama tanpa biaya. Bila Anda perlu membatalkan, cukup balas pesan WhatsApp kami.")), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    disabled: step === 1,
    onClick: () => setStep(Math.max(1, step - 1)),
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "chevron-left"
    })
  }, "Kembali"), step < 3 ? /*#__PURE__*/React.createElement(Button, {
    onClick: () => setStep(step + 1),
    iconRight: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "chevron-right"
    })
  }, "Lanjut") : /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    disabled: !consent,
    onClick: () => setConfirm(true)
  }, "Kirim permintaan jadwal"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)'
    }
  }, "Yang perlu Anda tahu"), [['clock', 'Datang 10 menit lebih awal'], ['footprints', 'Kenakan kaus kaki yang mudah dilepas'], ['shield-check', 'Sesi bisa dihentikan kapan saja'], ['phone', 'Kami konfirmasi maksimal 1×24 jam']].map(([icon, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "sage",
    size: 40
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)',
      lineHeight: 'var(--lh-normal)'
    }
  }, label)))), /*#__PURE__*/React.createElement(Card, {
    variant: "brand",
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "onBrand"
  }, "Butuh bantuan"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--teal-100)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, "Bila lebih nyaman lewat telepon, hubungi kami di 021 5555 8899, pukul 08.00\u201317.00."), /*#__PURE__*/React.createElement(Button, {
    variant: "onBrand",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "phone"
    })
  }, "Telepon Terasol")))), /*#__PURE__*/React.createElement(Dialog, {
    open: confirm,
    title: "Kirim permintaan jadwal ini?",
    description: `Senin, 8 September pukul ${slot} di Terasol Kelapa Gading.`,
    onClose: () => setConfirm(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setConfirm(false)
    }, "Kembali"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setConfirm(false);
        onToast('Permintaan jadwal terkirim. Kami hubungi lewat WhatsApp.');
      }
    }, "Ya, kirim"))
  }));
}
Object.assign(window, {
  BookingScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/BookingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
const {
  Logo,
  Divider
} = window.TerasolDesignSystem_d23356;
function Footer({
  onNavigate
}) {
  const cols = [{
    title: 'Layanan',
    links: ['Terapi Terahertz', 'Program 8 sesi', 'Konsultasi awal', 'Kunjungan keluarga']
  }, {
    title: 'Produk',
    links: ['FITSOL CM', 'FITSOL CN', 'FITSOL CE']
  }, {
    title: 'Terasol',
    links: ['Tentang kami', 'Cabang', 'Karier', 'Hubungi kami']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--gradient-sanctuary)',
      color: 'var(--text-on-brand)',
      paddingTop: 'var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: '0 var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(3, 1fr)',
      gap: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "lockup-white",
    height: 62,
    basePath: "../../assets"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--teal-200)',
      lineHeight: 'var(--lh-relaxed)',
      maxWidth: '32ch'
    }
  }, "Rumah sehat untuk usia 50 tahun ke atas. Terapi Terahertz, pendampingan wellness, dan suplemen FITSOL.")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--gold-400)'
    }
  }, c.title), c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate && onNavigate('program');
    },
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--teal-100)',
      textDecoration: 'none'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-11)',
      borderTop: '1px solid rgba(255,255,255,.14)',
      padding: 'var(--space-6) 0 var(--space-9)',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-6)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--teal-300)'
    }
  }, "\xA9 2026 Rumah Sehat Terasol. Terasol bukan pengganti pengobatan dokter."), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--teal-300)'
    }
  }, "Kelapa Gading \xB7 Bintaro"))));
}
Object.assign(window, {
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Hero,
  SectionHeading,
  Button,
  Card,
  IconCircle,
  ProgrammeCard,
  ProductCard,
  TestimonialCard,
  StatBlock,
  Divider
} = window.TerasolDesignSystem_d23356;
const PILLARS = [{
  icon: 'waves',
  title: 'Terapi Terahertz',
  body: 'Gelombang lembut untuk melancarkan peredaran darah di kaki dan tungkai.'
}, {
  icon: 'heart-handshake',
  title: 'Selalu didampingi',
  body: 'Terapis kami menemani dari awal sampai akhir sesi. Tidak ada yang ditinggal sendiri.'
}, {
  icon: 'shield-check',
  title: 'Tanpa janji berlebihan',
  body: 'Kami menjelaskan apa yang bisa dan tidak bisa dilakukan terapi ini.'
}];
const PROGRAMMES = [{
  title: 'Program Kaki Ringan',
  meta: ['40 menit', '8 sesi'],
  description: 'Untuk keluhan pegal dan kaki dingin.',
  price: 'Rp 1.800.000'
}, {
  title: 'Program Tidur Tenang',
  meta: ['40 menit', '12 sesi'],
  description: 'Untuk yang sulit tidur dan sering terbangun malam.',
  price: 'Rp 2.600.000'
}, {
  title: 'Kunjungan Pertama',
  meta: ['60 menit', '1 sesi'],
  description: 'Konsultasi, pengukuran, dan satu sesi percobaan.',
  price: 'Gratis'
}];
function HomeScreen({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Hero, {
    eyebrow: "Rumah Sehat Terasol",
    title: "Rumah untuk tubuh yang lebih tenang.",
    description: "Terapi Terahertz dan pendampingan wellness untuk usia 50 tahun ke atas. Duduk santai, kami dampingi dari awal sampai akhir.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      onClick: () => onNavigate('jadwal')
    }, "Jadwalkan kunjungan"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "lg",
      onClick: () => onNavigate('program')
    }, "Lihat program")),
    note: "Konsultasi awal tanpa biaya. Bisa dibatalkan kapan saja.",
    art: "brand-art-wave-layers.jpg",
    basePath: "../../assets"
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-12) var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)'
    }
  }, PILLARS.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.title,
    variant: "feature",
    padding: "lg",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "brand",
    size: 56
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": p.icon
  })), /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)'
    }
  }, p.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--text-body)'
    }
  }, p.body))))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--gradient-dawn)',
      padding: 'var(--space-12) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: '0 var(--page-pad)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-11)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Terapi Terahertz",
    title: "Satu sesi, empat puluh menit, tanpa tergesa.",
    description: "Anda duduk, kaki diletakkan di alas hangat, dan terapis menyesuaikan suhu bersama Anda. Bila terasa kurang nyaman, sesi bisa dihentikan kapan saja."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-9)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "40 menit",
    label: "Durasi satu sesi terapi"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "2 cabang",
    label: "Kelapa Gading dan Bintaro"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    onClick: () => onNavigate('program')
  }, "Lihat semua program"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)',
      borderRadius: 'var(--radius-2xl)',
      padding: 'var(--space-8)',
      display: 'grid',
      placeItems: 'center',
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/product-terahertz-in-use.png",
    alt: "Terapi Terahertz sedang digunakan",
    style: {
      width: '100%',
      maxWidth: 420
    }
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-12) var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Program",
    title: "Pilih program yang sesuai keluhan Anda",
    description: "Setiap program dirancang bersama terapis, dan bisa disesuaikan kapan saja."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-8)'
    }
  }, PROGRAMMES.map(p => /*#__PURE__*/React.createElement(ProgrammeCard, _extends({
    key: p.title
  }, p, {
    onSelect: () => onNavigate('program')
  }))))), /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--teal-900)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/brand-art-ribbon-textile.jpg",
    alt: "",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: .16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-12) var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    onBrand: true,
    align: "center",
    eyebrow: "Kata anggota kami",
    title: "Yang mereka rasakan setelah beberapa sesi"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement(TestimonialCard, {
    quote: "Kaki saya tidak lagi terasa dingin setiap pagi.",
    name: "Ibu Sari, 68",
    detail: "Program Kaki Ringan \xB7 Kelapa Gading"
  }), /*#__PURE__*/React.createElement(TestimonialCard, {
    quote: "Yang membuat saya kembali: tidak pernah dipaksa beli apa pun.",
    name: "Bapak Hendra, 71",
    detail: "Program Tidur Tenang \xB7 Bintaro"
  }), /*#__PURE__*/React.createElement(TestimonialCard, {
    quote: "Terapisnya sabar menjelaskan sampai saya benar-benar paham.",
    name: "Ibu Ratna, 63",
    detail: "Kunjungan pertama \xB7 Kelapa Gading"
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-12) var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Suplemen FITSOL",
    title: "Pendamping harian, bukan pengganti terapi",
    description: "Tiga varian FITSOL tersedia di kedua cabang. Terapis akan menyarankan hanya bila memang diperlukan.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => onNavigate('produk')
    }, "Lihat produk FITSOL")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement(ProductCard, {
    image: "product-fitsol-cm-cn-ce.png",
    basePath: "../../assets",
    kind: "Suplemen kesehatan",
    name: "FITSOL CM",
    description: "Formula mineral harian.",
    price: "Rp 340.000",
    onSelect: () => onNavigate('produk')
  }), /*#__PURE__*/React.createElement(ProductCard, {
    image: "product-fitsol-cm-cn-ce.png",
    basePath: "../../assets",
    kind: "Suplemen kesehatan",
    name: "FITSOL CN",
    description: "Sari sayur dan buah dalam bentuk bubuk.",
    price: "Rp 385.000",
    badge: "Paling dicari",
    onSelect: () => onNavigate('produk')
  }), /*#__PURE__*/React.createElement(ProductCard, {
    image: "product-fitsol-cm-cn-ce.png",
    basePath: "../../assets",
    kind: "Suplemen kesehatan",
    name: "FITSOL CE",
    description: "Untuk pemulihan setelah aktivitas berat.",
    price: "Rp 410.000",
    onSelect: () => onNavigate('produk')
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: '0 var(--page-pad) var(--space-13)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "brand",
    padding: "lg",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-9)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      maxWidth: '38ch'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d3)',
      fontWeight: 'var(--fw-light)',
      color: 'var(--ivory-050)'
    }
  }, "Datang dulu, rasakan satu sesi."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--teal-200)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, "Kunjungan pertama tanpa biaya, termasuk konsultasi dan satu sesi percobaan.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "onBrand",
    size: "lg",
    onClick: () => onNavigate('jadwal')
  }, "Jadwalkan kunjungan"), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "messages-square"
    })
  }, "Tanya lewat WhatsApp")))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ProductScreen.jsx
try { (() => {
const {
  Breadcrumb,
  SectionHeading,
  Card,
  Button,
  Badge,
  Divider,
  ProductCard,
  Alert,
  IconCircle
} = window.TerasolDesignSystem_d23356;
const VARIANTS = [{
  code: 'CM',
  name: 'FITSOL CM',
  price: 'Rp 340.000',
  description: 'Formula mineral harian.'
}, {
  code: 'CN',
  name: 'FITSOL CN',
  price: 'Rp 385.000',
  description: 'Sari sayur dan buah dalam bentuk bubuk.'
}, {
  code: 'CE',
  name: 'FITSOL CE',
  price: 'Rp 410.000',
  description: 'Untuk pemulihan setelah aktivitas berat.'
}];
function ProductScreen({
  onNavigate
}) {
  const [sel, setSel] = React.useState('CN');
  const current = VARIANTS.find(v => v.code === sel);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-9) var(--page-pad) var(--space-13)'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: [{
      id: 'home',
      label: 'Beranda'
    }, {
      id: 'produk',
      label: 'Produk'
    }, {
      label: current.name
    }],
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-11)',
      marginTop: 'var(--space-7)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ivory-050)',
      borderRadius: 'var(--radius-2xl)',
      padding: 'var(--space-9)',
      display: 'grid',
      placeItems: 'center',
      border: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/product-fitsol-cm-cn-ce.png",
    alt: "FITSOL CM, CN dan CE",
    style: {
      width: '100%',
      maxWidth: 460
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--text-accent)'
    }
  }, "Suplemen kesehatan"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d1)',
      fontWeight: 'var(--fw-light)',
      color: 'var(--teal-900)',
      lineHeight: 'var(--lh-tight)'
    }
  }, current.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--lh-relaxed)',
      color: 'var(--text-body)',
      maxWidth: '40ch'
    }
  }, current.description, " Tersedia di kedua cabang Terasol, dan bisa dibawa pulang setelah sesi."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--ls-label)',
      color: 'var(--teal-900)'
    }
  }, "Pilih varian"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, VARIANTS.map(v => /*#__PURE__*/React.createElement("button", {
    key: v.code,
    type: "button",
    onClick: () => setSel(v.code),
    style: {
      minHeight: 'var(--tap-min)',
      padding: '0 var(--space-6)',
      cursor: 'pointer',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-md)',
      fontWeight: sel === v.code ? 'var(--fw-semibold)' : 'var(--fw-regular)',
      background: sel === v.code ? 'var(--brand-soft)' : 'var(--white)',
      color: sel === v.code ? 'var(--teal-900)' : 'var(--text-body)',
      border: sel === v.code ? '2px solid var(--teal-700)' : '1px solid var(--border-hairline)',
      transition: 'var(--transition-control)'
    }
  }, v.code)))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d2)',
      fontWeight: 'var(--fw-light)',
      color: 'var(--teal-800)'
    }
  }, current.price), /*#__PURE__*/React.createElement(Badge, {
    tone: "sage"
  }, "Kaleng 500 g")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "messages-square"
    })
  }, "Tanya lewat WhatsApp"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => onNavigate('jadwal')
  }, "Ambil saat kunjungan")), /*#__PURE__*/React.createElement(Alert, {
    tone: "warning"
  }, "FITSOL adalah suplemen kesehatan, bukan obat. Bila Anda sedang dalam pengobatan dokter, tanyakan lebih dahulu kepada dokter Anda."))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Cara pakai",
    title: "Tiga langkah, setiap pagi"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-7)'
    }
  }, [['leaf', 'Satu takar', 'Gunakan takaran yang disertakan di dalam kaleng.'], ['thermometer', 'Air hangat', 'Larutkan dalam 150 ml air hangat, bukan air panas.'], ['clock', 'Setelah makan', 'Diminum setelah makan pagi, setiap hari pada jam yang sama.']].map(([icon, t, b]) => /*#__PURE__*/React.createElement(Card, {
    key: t,
    padding: "md",
    style: {
      display: 'flex',
      gap: 'var(--space-5)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "brand",
    size: 48
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-d4)',
      fontWeight: 'var(--fw-medium)',
      color: 'var(--text-heading)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, b)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Varian lain",
    title: "Lengkapi dengan varian yang sesuai"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-7)'
    }
  }, VARIANTS.map(v => /*#__PURE__*/React.createElement(ProductCard, {
    key: v.code,
    image: "product-fitsol-cm-cn-ce.png",
    basePath: "../../assets",
    kind: "Suplemen kesehatan",
    name: v.name,
    description: v.description,
    price: v.price,
    onSelect: () => setSel(v.code)
  })))));
}
Object.assign(window, {
  ProductScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ProductScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ProgrammesScreen.jsx
try { (() => {
const {
  SectionHeading,
  Breadcrumb,
  Tag,
  ProgrammeCard,
  Card,
  Pagination,
  Button,
  Alert,
  IconCircle,
  Divider
} = window.TerasolDesignSystem_d23356;
const ALL = [{
  title: 'Program Kaki Ringan',
  meta: ['40 menit', '8 sesi'],
  description: 'Untuk keluhan pegal dan kaki dingin.',
  price: 'Rp 1.800.000',
  tags: ['Pegal & nyeri', 'Kaki dingin']
}, {
  title: 'Program Tidur Tenang',
  meta: ['40 menit', '12 sesi'],
  description: 'Untuk yang sulit tidur dan sering terbangun malam.',
  price: 'Rp 2.600.000',
  tags: ['Sulit tidur']
}, {
  title: 'Program Langkah Stabil',
  meta: ['50 menit', '10 sesi'],
  description: 'Untuk yang merasa kurang mantap saat berjalan.',
  price: 'Rp 2.400.000',
  tags: ['Pegal & nyeri']
}, {
  title: 'Program Pagi Segar',
  meta: ['40 menit', '6 sesi'],
  description: 'Untuk badan yang terasa berat setiap bangun tidur.',
  price: 'Rp 1.450.000',
  tags: ['Sulit tidur', 'Pegal & nyeri']
}, {
  title: 'Pendampingan Keluarga',
  meta: ['60 menit', '4 sesi'],
  description: 'Sesi bersama pendamping, agar keluarga ikut memahami.',
  price: 'Rp 1.200.000',
  tags: ['Kaki dingin']
}, {
  title: 'Kunjungan Pertama',
  meta: ['60 menit', '1 sesi'],
  description: 'Konsultasi, pengukuran, dan satu sesi percobaan.',
  price: 'Gratis',
  tags: []
}];
const FILTERS = ['Pegal & nyeri', 'Kaki dingin', 'Sulit tidur'];
function ProgrammesScreen({
  onNavigate
}) {
  const [active, setActive] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const toggle = f => setActive(a => a.includes(f) ? a.filter(x => x !== f) : [...a, f]);
  const list = active.length ? ALL.filter(p => p.tags.some(t => active.includes(t))) : ALL;
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--page-max)',
      margin: '0 auto',
      padding: 'var(--space-9) var(--page-pad) var(--space-13)'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    items: [{
      id: 'home',
      label: 'Beranda'
    }, {
      label: 'Program'
    }],
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Program",
    title: "Program terapi Terasol",
    description: "Semua program dijalankan di kedua cabang. Pilih berdasarkan keluhan yang Anda rasakan, atau biarkan terapis membantu memilih."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap',
      margin: 'var(--space-8) 0 var(--space-6)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-muted)',
      letterSpacing: 'var(--ls-label)',
      marginRight: 'var(--space-2)'
    }
  }, "Keluhan"), FILTERS.map(f => /*#__PURE__*/React.createElement(Tag, {
    key: f,
    selected: active.includes(f),
    onClick: () => toggle(f)
  }, f)), active.length > 0 && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => setActive([])
  }, "Hapus filter")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-6)',
      alignItems: 'stretch'
    }
  }, list.map(p => /*#__PURE__*/React.createElement(ProgrammeCard, {
    key: p.title,
    title: p.title,
    meta: p.meta,
    description: p.description,
    price: p.price,
    onSelect: () => onNavigate('jadwal')
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 2,
    onChange: setPage
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-11)',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 'var(--space-7)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "brand",
    title: "Belum yakin program mana yang cocok?",
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => onNavigate('jadwal')
    }, "Jadwalkan kunjungan pertama")
  }, "Kunjungan pertama tanpa biaya. Terapis akan mengukur kondisi Anda dan menyarankan program yang paling sesuai \u2014 tanpa kewajiban membeli apa pun."), /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, [['clock', 'Setiap sesi 40–60 menit'], ['map-pin', 'Kelapa Gading dan Bintaro'], ['phone', 'Konfirmasi lewat WhatsApp']].map(([icon, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconCircle, {
    tone: "sage",
    size: 40
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-md)',
      color: 'var(--text-body)'
    }
  }, label))))));
}
Object.assign(window, {
  ProgrammesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ProgrammesScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.IconCircle = __ds_scope.IconCircle;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FieldGroup = __ds_scope.FieldGroup;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.Hero = __ds_scope.Hero;

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.ProgrammeCard = __ds_scope.ProgrammeCard;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.SessionCard = __ds_scope.SessionCard;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.TestimonialCard = __ds_scope.TestimonialCard;

})();

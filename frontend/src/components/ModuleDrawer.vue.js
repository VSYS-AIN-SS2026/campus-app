import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
const props = defineProps();
const emit = defineEmits();
const selectedCourse = ref(null);
const navDir = ref('slide-forward');
watch(() => props.module, (m) => { if (!m)
    selectedCourse.value = null; });
function openCourse(course) { navDir.value = 'slide-forward'; selectedCourse.value = course; }
function goBack() { navDir.value = 'slide-back'; selectedCourse.value = null; }
function closeAll() { selectedCourse.value = null; emit('close'); }
function onKeydown(e) {
    if (e.key === 'Escape')
        selectedCourse.value ? goBack() : closeAll();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
// ─── course-type labels ────────────────────────────────────────
const TYPE_SHORT = {
    vorlesung: 'V', lecture: 'V', praktikum: 'P',
    seminar: 'S', übung: 'Ü', exercise: 'Ü', uebung: 'Ü',
};
const TYPE_FULL = {
    vorlesung: 'Vorlesung', lecture: 'Vorlesung', praktikum: 'Praktikum',
    seminar: 'Seminar', übung: 'Übung', exercise: 'Übung', uebung: 'Übung',
};
function typeShort(t) { return TYPE_SHORT[t.toLowerCase()] ?? t.charAt(0).toUpperCase(); }
function typeFull(t) { return TYPE_FULL[t.toLowerCase()] ?? t; }
const WORKLOAD_KEYS = new Set(['workload']);
const PRUEFUNG_KEYS = new Set(['pruefung', 'prüfung', 'exam', 'pruefungsform', 'prüfungsform']);
const VORAUSS_KEYS = new Set(['voraussetzungen', 'prerequisites', 'voraussetzung']);
const KEY_LABELS = {
    beschreibung: 'Beschreibung', description: 'Beschreibung',
    lernziele: 'Lernziele', learning_objectives: 'Lernziele',
    voraussetzungen: 'Voraussetzungen', prerequisites: 'Voraussetzungen', voraussetzung: 'Voraussetzungen',
    literatur: 'Literatur', literature: 'Literatur',
    sprache: 'Sprache', language: 'Sprache',
    pruefung: 'Prüfung', prüfung: 'Prüfung',
    exam: 'Prüfungsform', pruefungsform: 'Prüfungsform', prüfungsform: 'Prüfungsform',
    workload: 'Workload', niveau: 'Niveau',
};
function formatKey(k) {
    return KEY_LABELS[k.toLowerCase()] ?? k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
const HTML_RE = /<[a-z][\s\S]*>/i;
function kindOf(k, v) {
    // value-type detection takes priority over field name
    if (typeof v === 'object' && v !== null && !Array.isArray(v))
        return 'object';
    if (typeof v === 'string' && HTML_RE.test(v))
        return 'html';
    const l = k.toLowerCase();
    if (WORKLOAD_KEYS.has(l))
        return 'workload';
    if (PRUEFUNG_KEYS.has(l))
        return 'pruefung';
    if (VORAUSS_KEYS.has(l))
        return 'voraussetzungen';
    return 'text';
}
function buildItems(details) {
    return Object.entries(details)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => ({ key: k, label: formatKey(k), kind: kindOf(k, v), raw: v }));
}
function objectEntries(raw) {
    return Object.entries(raw).filter(([, v]) => v != null && v !== '');
}
// parse workload value → { hours, note }
function parseWorkload(v) {
    const s = String(v ?? '').trim();
    const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(h|std\.?|stunden?)?\s*(.*)$/i);
    if (m)
        return { hours: `${m[1]} h`, note: (m[3] ?? '').trim() };
    return { hours: s, note: '' };
}
// split prerequisites by delimiters → chip array
function splitReqs(v) {
    return String(v ?? '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
}
// ─── computed ──────────────────────────────────────────────────
const totalEcts = computed(() => props.module?.courses.reduce((s, c) => s + (c.ects ?? 0), 0) ?? 0);
const moduleItems = computed(() => buildItems(props.module?.details ?? {}));
const courseItems = computed(() => buildItems(selectedCourse.value?.details ?? {}));
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['course-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['course-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['dtext-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dtext-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-workload']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-pruefung']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-vorauss']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['vorlesung']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lecture']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['praktikum']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['seminar']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['exercise']} */ ;
/** @type {__VLS_StyleScopedClasses['type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['uebung']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-html']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['html-content']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-object']} */ ;
/** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
/** @type {__VLS_StyleScopedClasses['obj-row']} */ ;
/** @type {__VLS_StyleScopedClasses['obj-row']} */ ;
/** @type {__VLS_StyleScopedClasses['obj-row']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
Teleport;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "body",
}));
const __VLS_2 = __VLS_1({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
let __VLS_6;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    name: "backdrop",
}));
const __VLS_8 = __VLS_7({
    name: "backdrop",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots;
if (__VLS_ctx.module) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeAll) },
        ...{ class: "backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['backdrop']} */ ;
}
// @ts-ignore
[module, closeAll,];
var __VLS_9;
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    name: "drawer",
}));
const __VLS_14 = __VLS_13({
    name: "drawer",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots;
if (__VLS_ctx.module) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "drawer" },
        role: "dialog",
        'aria-modal': "true",
    });
    /** @type {__VLS_StyleScopedClasses['drawer']} */ ;
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        name: (__VLS_ctx.navDir),
        mode: "out-in",
    }));
    const __VLS_20 = __VLS_19({
        name: (__VLS_ctx.navDir),
        mode: "out-in",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    const { default: __VLS_23 } = __VLS_21.slots;
    if (!__VLS_ctx.selectedCourse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: "module",
            ...{ class: "view" },
        });
        /** @type {__VLS_StyleScopedClasses['view']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
            ...{ class: "drawer-header" },
        });
        /** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "code-pill" },
        });
        /** @type {__VLS_StyleScopedClasses['code-pill']} */ ;
        (__VLS_ctx.module.code);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.closeAll) },
            ...{ class: "icon-btn" },
            'aria-label': "Schließen",
        });
        /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 16 16",
            fill: "none",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M2 2l12 12M14 2L2 14",
            stroke: "currentColor",
            'stroke-width': "1.8",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "drawer-body" },
        });
        /** @type {__VLS_StyleScopedClasses['drawer-body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hero" },
        });
        /** @type {__VLS_StyleScopedClasses['hero']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "big-title" },
        });
        /** @type {__VLS_StyleScopedClasses['big-title']} */ ;
        (__VLS_ctx.module.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chip-row" },
        });
        /** @type {__VLS_StyleScopedClasses['chip-row']} */ ;
        if (__VLS_ctx.module.recommended_semester) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "chip chip-semester" },
            });
            /** @type {__VLS_StyleScopedClasses['chip']} */ ;
            /** @type {__VLS_StyleScopedClasses['chip-semester']} */ ;
            (__VLS_ctx.module.recommended_semester);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "chip chip-ects" },
        });
        /** @type {__VLS_StyleScopedClasses['chip']} */ ;
        /** @type {__VLS_StyleScopedClasses['chip-ects']} */ ;
        (__VLS_ctx.totalEcts);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "chip chip-plain" },
        });
        /** @type {__VLS_StyleScopedClasses['chip']} */ ;
        /** @type {__VLS_StyleScopedClasses['chip-plain']} */ ;
        (__VLS_ctx.module.version);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "coordinator-row" },
        });
        /** @type {__VLS_StyleScopedClasses['coordinator-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "14",
            height: "14",
            viewBox: "0 0 16 16",
            fill: "none",
            ...{ class: "icon-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['icon-muted']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            cx: "8",
            cy: "5",
            r: "3",
            stroke: "currentColor",
            'stroke-width': "1.6",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6",
            stroke: "currentColor",
            'stroke-width': "1.6",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.module.coordinator);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-muted" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        (__VLS_ctx.module.start_semester);
        if (__VLS_ctx.module.courses.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "section" },
            });
            /** @type {__VLS_StyleScopedClasses['section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "section-header" },
            });
            /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "section-title" },
            });
            /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "count-badge" },
            });
            /** @type {__VLS_StyleScopedClasses['count-badge']} */ ;
            (__VLS_ctx.module.courses.length);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "course-list" },
            });
            /** @type {__VLS_StyleScopedClasses['course-list']} */ ;
            for (const [c] of __VLS_vFor((__VLS_ctx.module.courses))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.module))
                                return;
                            if (!(!__VLS_ctx.selectedCourse))
                                return;
                            if (!(__VLS_ctx.module.courses.length))
                                return;
                            __VLS_ctx.openCourse(c);
                            // @ts-ignore
                            [module, module, module, module, module, module, module, module, module, module, module, closeAll, navDir, selectedCourse, totalEcts, openCourse,];
                        } },
                    key: (c.id),
                    ...{ class: "course-btn" },
                });
                /** @type {__VLS_StyleScopedClasses['course-btn']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "type-badge" },
                    ...{ class: (c.course_type.toLowerCase()) },
                });
                /** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
                (__VLS_ctx.typeShort(c.course_type));
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "course-info" },
                });
                /** @type {__VLS_StyleScopedClasses['course-info']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "course-name" },
                });
                /** @type {__VLS_StyleScopedClasses['course-name']} */ ;
                (c.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "course-meta" },
                });
                /** @type {__VLS_StyleScopedClasses['course-meta']} */ ;
                (c.ects);
                (c.sws);
                if (c.coordinator) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                    (c.coordinator);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                    ...{ class: "chevron" },
                    width: "16",
                    height: "16",
                    viewBox: "0 0 16 16",
                    fill: "none",
                });
                /** @type {__VLS_StyleScopedClasses['chevron']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                    d: "M6 4l4 4-4 4",
                    stroke: "currentColor",
                    'stroke-width': "1.8",
                    'stroke-linecap': "round",
                    'stroke-linejoin': "round",
                });
                // @ts-ignore
                [typeShort,];
            }
        }
        if (__VLS_ctx.moduleItems.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "section" },
            });
            /** @type {__VLS_StyleScopedClasses['section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "section-header" },
            });
            /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "section-title" },
            });
            /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "details-stack" },
            });
            /** @type {__VLS_StyleScopedClasses['details-stack']} */ ;
            for (const [item] of __VLS_vFor((__VLS_ctx.moduleItems))) {
                (item.key);
                if (item.kind === 'workload') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-workload" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-workload']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "8",
                        cy: "8",
                        r: "6.5",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M8 5v3.5l2.5 1.5",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "workload-body" },
                    });
                    /** @type {__VLS_StyleScopedClasses['workload-body']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "workload-hours" },
                    });
                    /** @type {__VLS_StyleScopedClasses['workload-hours']} */ ;
                    (__VLS_ctx.parseWorkload(item.raw).hours);
                    if (__VLS_ctx.parseWorkload(item.raw).note) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "workload-note" },
                        });
                        /** @type {__VLS_StyleScopedClasses['workload-note']} */ ;
                        (__VLS_ctx.parseWorkload(item.raw).note);
                    }
                }
                else if (item.kind === 'pruefung') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-pruefung" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-pruefung']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
                        x: "3",
                        y: "1",
                        width: "10",
                        height: "14",
                        rx: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M6 5h4M6 8h4M6 11h2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "dcard-text" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-text']} */ ;
                    (item.raw);
                }
                else if (item.kind === 'voraussetzungen') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-vorauss" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-vorauss']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "4",
                        cy: "8",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "12",
                        cy: "4",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "12",
                        cy: "12",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M6 7.3l4-2.6M6 8.7l4 2.6",
                        stroke: "currentColor",
                        'stroke-width': "1.3",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    if (__VLS_ctx.splitReqs(item.raw).length > 1) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "req-chips" },
                        });
                        /** @type {__VLS_StyleScopedClasses['req-chips']} */ ;
                        for (const [r] of __VLS_vFor((__VLS_ctx.splitReqs(item.raw)))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                key: (r),
                                ...{ class: "req-chip" },
                            });
                            /** @type {__VLS_StyleScopedClasses['req-chip']} */ ;
                            (r);
                            // @ts-ignore
                            [moduleItems, moduleItems, parseWorkload, parseWorkload, parseWorkload, splitReqs, splitReqs,];
                        }
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "dcard-text" },
                        });
                        /** @type {__VLS_StyleScopedClasses['dcard-text']} */ ;
                        (item.raw);
                    }
                }
                else if (item.kind === 'html') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-html" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-html']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                        ...{ class: "html-content" },
                    });
                    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (String(item.raw)) }, null, null);
                    /** @type {__VLS_StyleScopedClasses['html-content']} */ ;
                }
                else if (item.kind === 'object') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-object" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-object']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dl, __VLS_intrinsics.dl)({
                        ...{ class: "obj-list" },
                    });
                    /** @type {__VLS_StyleScopedClasses['obj-list']} */ ;
                    for (const [[ok, ov]] of __VLS_vFor((__VLS_ctx.objectEntries(item.raw)))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (ok),
                            ...{ class: "obj-row" },
                        });
                        /** @type {__VLS_StyleScopedClasses['obj-row']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
                        (__VLS_ctx.formatKey(ok));
                        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
                        (ov);
                        // @ts-ignore
                        [objectEntries, formatKey,];
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dtext-item" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dtext-item']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
                    (item.raw);
                }
                // @ts-ignore
                [];
            }
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: "course",
            ...{ class: "view" },
        });
        /** @type {__VLS_StyleScopedClasses['view']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
            ...{ class: "drawer-header" },
        });
        /** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.goBack) },
            ...{ class: "back-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 16 16",
            fill: "none",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M10 4L6 8l4 4",
            stroke: "currentColor",
            'stroke-width': "1.8",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.closeAll) },
            ...{ class: "icon-btn" },
            'aria-label': "Schließen",
        });
        /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 16 16",
            fill: "none",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M2 2l12 12M14 2L2 14",
            stroke: "currentColor",
            'stroke-width': "1.8",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "drawer-body" },
        });
        /** @type {__VLS_StyleScopedClasses['drawer-body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hero" },
        });
        /** @type {__VLS_StyleScopedClasses['hero']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "type-label" },
            ...{ class: (__VLS_ctx.selectedCourse.course_type.toLowerCase()) },
        });
        /** @type {__VLS_StyleScopedClasses['type-label']} */ ;
        (__VLS_ctx.typeFull(__VLS_ctx.selectedCourse.course_type));
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "big-title" },
        });
        /** @type {__VLS_StyleScopedClasses['big-title']} */ ;
        (__VLS_ctx.selectedCourse.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "stat-row" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "stat-card" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-number" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-number']} */ ;
        (__VLS_ctx.selectedCourse.ects);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-unit" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-unit']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "stat-divider" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-divider']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "stat-card" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-number" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-number']} */ ;
        (__VLS_ctx.selectedCourse.sws);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stat-unit" },
        });
        /** @type {__VLS_StyleScopedClasses['stat-unit']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-block" },
        });
        /** @type {__VLS_StyleScopedClasses['info-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-row" },
        });
        /** @type {__VLS_StyleScopedClasses['info-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-label" },
        });
        /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "info-value mono" },
        });
        /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
        /** @type {__VLS_StyleScopedClasses['mono']} */ ;
        (__VLS_ctx.selectedCourse.code);
        if (__VLS_ctx.selectedCourse.coordinator) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "info-row" },
            });
            /** @type {__VLS_StyleScopedClasses['info-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "info-label" },
            });
            /** @type {__VLS_StyleScopedClasses['info-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "info-value" },
            });
            /** @type {__VLS_StyleScopedClasses['info-value']} */ ;
            (__VLS_ctx.selectedCourse.coordinator);
        }
        if (__VLS_ctx.courseItems.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                ...{ class: "section" },
            });
            /** @type {__VLS_StyleScopedClasses['section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "section-header" },
            });
            /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "section-title" },
            });
            /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "details-stack" },
            });
            /** @type {__VLS_StyleScopedClasses['details-stack']} */ ;
            for (const [item] of __VLS_vFor((__VLS_ctx.courseItems))) {
                (item.key);
                if (item.kind === 'workload') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-workload" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-workload']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "8",
                        cy: "8",
                        r: "6.5",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M8 5v3.5l2.5 1.5",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "workload-body" },
                    });
                    /** @type {__VLS_StyleScopedClasses['workload-body']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "workload-hours" },
                    });
                    /** @type {__VLS_StyleScopedClasses['workload-hours']} */ ;
                    (__VLS_ctx.parseWorkload(item.raw).hours);
                    if (__VLS_ctx.parseWorkload(item.raw).note) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "workload-note" },
                        });
                        /** @type {__VLS_StyleScopedClasses['workload-note']} */ ;
                        (__VLS_ctx.parseWorkload(item.raw).note);
                    }
                }
                else if (item.kind === 'pruefung') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-pruefung" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-pruefung']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
                        x: "3",
                        y: "1",
                        width: "10",
                        height: "14",
                        rx: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.6",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M6 5h4M6 8h4M6 11h2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "dcard-text" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-text']} */ ;
                    (item.raw);
                }
                else if (item.kind === 'voraussetzungen') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-vorauss" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-vorauss']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                        width: "13",
                        height: "13",
                        viewBox: "0 0 16 16",
                        fill: "none",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "4",
                        cy: "8",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "12",
                        cy: "4",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
                        cx: "12",
                        cy: "12",
                        r: "2",
                        stroke: "currentColor",
                        'stroke-width': "1.5",
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                        d: "M6 7.3l4-2.6M6 8.7l4 2.6",
                        stroke: "currentColor",
                        'stroke-width': "1.3",
                        'stroke-linecap': "round",
                    });
                    (item.label);
                    if (__VLS_ctx.splitReqs(item.raw).length > 1) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "req-chips" },
                        });
                        /** @type {__VLS_StyleScopedClasses['req-chips']} */ ;
                        for (const [r] of __VLS_vFor((__VLS_ctx.splitReqs(item.raw)))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                key: (r),
                                ...{ class: "req-chip" },
                            });
                            /** @type {__VLS_StyleScopedClasses['req-chip']} */ ;
                            (r);
                            // @ts-ignore
                            [closeAll, selectedCourse, selectedCourse, selectedCourse, selectedCourse, selectedCourse, selectedCourse, selectedCourse, selectedCourse, parseWorkload, parseWorkload, parseWorkload, splitReqs, splitReqs, goBack, typeFull, courseItems, courseItems,];
                        }
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "dcard-text" },
                        });
                        /** @type {__VLS_StyleScopedClasses['dcard-text']} */ ;
                        (item.raw);
                    }
                }
                else if (item.kind === 'html') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-html" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-html']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
                        ...{ class: "html-content" },
                    });
                    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (String(item.raw)) }, null, null);
                    /** @type {__VLS_StyleScopedClasses['html-content']} */ ;
                }
                else if (item.kind === 'object') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard dcard-object" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard']} */ ;
                    /** @type {__VLS_StyleScopedClasses['dcard-object']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dcard-label" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dcard-label']} */ ;
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dl, __VLS_intrinsics.dl)({
                        ...{ class: "obj-list" },
                    });
                    /** @type {__VLS_StyleScopedClasses['obj-list']} */ ;
                    for (const [[ok, ov]] of __VLS_vFor((__VLS_ctx.objectEntries(item.raw)))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (ok),
                            ...{ class: "obj-row" },
                        });
                        /** @type {__VLS_StyleScopedClasses['obj-row']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
                        (__VLS_ctx.formatKey(ok));
                        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
                        (ov);
                        // @ts-ignore
                        [objectEntries, formatKey,];
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "dtext-item" },
                    });
                    /** @type {__VLS_StyleScopedClasses['dtext-item']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
                    (item.label);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
                    (item.raw);
                }
                // @ts-ignore
                [];
            }
        }
        else if (!__VLS_ctx.selectedCourse.coordinator) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "empty-hint" },
            });
            /** @type {__VLS_StyleScopedClasses['empty-hint']} */ ;
        }
    }
    // @ts-ignore
    [selectedCourse,];
    var __VLS_21;
}
// @ts-ignore
[];
var __VLS_15;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

import { ref, watch, computed } from 'vue';
import { supabase } from './supabase';
import SpoSelector from './components/SpoSelector.vue';
import ModuleList from './components/ModuleList.vue';
import ModuleDrawer from './components/ModuleDrawer.vue';
// --- raw data from DB ---
const studyPrograms = ref([]);
const allHandbooks = ref([]);
// --- selection state ---
const selectedStudyProgramId = ref(localStorage.getItem('selectedStudyProgramId') || null);
const selectedHandbookId = ref(localStorage.getItem('selectedHandbookId') || null);
// --- modules ---
const modules = ref([]);
const selectedModule = ref(null);
const loading = ref(false);
const error = ref(null);
// --- dropdown items ---
const studyProgramItems = computed(() => studyPrograms.value.map(sp => ({ id: sp.id, label: sp.name ?? sp.code })));
const handbookItems = computed(() => {
    if (!selectedStudyProgramId.value)
        return [];
    return allHandbooks.value
        .filter(h => h.spos?.study_program_id === selectedStudyProgramId.value)
        .map(h => ({ id: h.id, label: h.code }));
});
// --- stats ---
const totalEcts = computed(() => modules.value.reduce((s, m) => s + m.courses.reduce((cs, c) => cs + (c.ects ?? 0), 0), 0));
const totalCourses = computed(() => modules.value.reduce((s, m) => s + m.courses.length, 0));
async function fetchInitialData() {
    loading.value = true;
    error.value = null;
    const [spRes, hbRes] = await Promise.all([
        supabase.from('study_programs').select('id, name, code').order('name'),
        supabase.from('module_handbooks').select('id, code, spos(study_program_id, version_name)').order('code'),
    ]);
    loading.value = false;
    if (spRes.error) {
        error.value = spRes.error.message;
        return;
    }
    if (hbRes.error) {
        error.value = hbRes.error.message;
        return;
    }
    studyPrograms.value = spRes.data;
    allHandbooks.value = hbRes.data ?? [];
}
async function fetchModules(handbookId) {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await supabase
        .from('module_handbook_entries')
        .select('recommended_semester, modules(id, code, name, coordinator, start_semester, version, details, courses(*))')
        .eq('handbook_id', handbookId)
        .order('recommended_semester');
    loading.value = false;
    if (err) {
        error.value = err.message;
        return;
    }
    modules.value = data.map(row => ({
        ...row.modules,
        recommended_semester: row.recommended_semester,
        courses: row.modules?.courses ?? [],
    }));
}
// when study program changes, reset handbook selection
watch(selectedStudyProgramId, (id) => {
    localStorage.setItem('selectedStudyProgramId', id ?? '');
    selectedHandbookId.value = null;
    modules.value = [];
});
watch(selectedHandbookId, (id) => {
    localStorage.setItem('selectedHandbookId', id ?? '');
    if (id)
        fetchModules(id);
    else
        modules.value = [];
}, { immediate: true });
fetchInitialData();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['controls-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app" },
});
/** @type {__VLS_StyleScopedClasses['app']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "app-header" },
});
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-inner" },
});
/** @type {__VLS_StyleScopedClasses['header-inner']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-icon" },
});
/** @type {__VLS_StyleScopedClasses['brand-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-name" },
});
/** @type {__VLS_StyleScopedClasses['brand-name']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "app-main" },
});
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "page-title" },
});
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "page-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "controls-bar" },
});
/** @type {__VLS_StyleScopedClasses['controls-bar']} */ ;
const __VLS_0 = SpoSelector;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.selectedStudyProgramId),
    items: (__VLS_ctx.studyProgramItems),
    loading: (__VLS_ctx.loading && !__VLS_ctx.studyPrograms.length),
    label: "Studiengang",
    placeholder: "— Studiengang auswählen —",
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.selectedStudyProgramId),
    items: (__VLS_ctx.studyProgramItems),
    loading: (__VLS_ctx.loading && !__VLS_ctx.studyPrograms.length),
    label: "Studiengang",
    placeholder: "— Studiengang auswählen —",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_5 = SpoSelector;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    modelValue: (__VLS_ctx.selectedHandbookId),
    items: (__VLS_ctx.handbookItems),
    loading: (false),
    label: "SPO Kürzel",
    placeholder: "— SPO auswählen —",
}));
const __VLS_7 = __VLS_6({
    modelValue: (__VLS_ctx.selectedHandbookId),
    items: (__VLS_ctx.handbookItems),
    loading: (false),
    label: "SPO Kürzel",
    placeholder: "— SPO auswählen —",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-banner" },
    });
    /** @type {__VLS_StyleScopedClasses['error-banner']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.selectedHandbookId && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stats-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['stats-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat" },
    });
    /** @type {__VLS_StyleScopedClasses['stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-value" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
    (__VLS_ctx.modules.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat" },
    });
    /** @type {__VLS_StyleScopedClasses['stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-value" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
    (__VLS_ctx.totalCourses);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat" },
    });
    /** @type {__VLS_StyleScopedClasses['stat']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-value" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
    (__VLS_ctx.totalEcts);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    const __VLS_10 = ModuleList;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        ...{ 'onSelect': {} },
        modules: (__VLS_ctx.modules),
    }));
    const __VLS_12 = __VLS_11({
        ...{ 'onSelect': {} },
        modules: (__VLS_ctx.modules),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    let __VLS_15;
    const __VLS_16 = ({ select: {} },
        { onSelect: (...[$event]) => {
                if (!(__VLS_ctx.selectedHandbookId && !__VLS_ctx.loading))
                    return;
                __VLS_ctx.selectedModule = $event;
                // @ts-ignore
                [selectedStudyProgramId, studyProgramItems, loading, loading, studyPrograms, selectedHandbookId, selectedHandbookId, handbookItems, error, error, modules, modules, totalCourses, totalEcts, selectedModule,];
            } });
    var __VLS_13;
    var __VLS_14;
}
else if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loading-state" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "spinner" },
    });
    /** @type {__VLS_StyleScopedClasses['spinner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else if (!__VLS_ctx.selectedStudyProgramId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else if (!__VLS_ctx.selectedHandbookId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
const __VLS_17 = ModuleDrawer;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
    ...{ 'onClose': {} },
    module: (__VLS_ctx.selectedModule),
}));
const __VLS_19 = __VLS_18({
    ...{ 'onClose': {} },
    module: (__VLS_ctx.selectedModule),
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
let __VLS_22;
const __VLS_23 = ({ close: {} },
    { onClose: (...[$event]) => {
            __VLS_ctx.selectedModule = null;
            // @ts-ignore
            [selectedStudyProgramId, loading, selectedHandbookId, selectedModule, selectedModule,];
        } });
var __VLS_20;
var __VLS_21;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

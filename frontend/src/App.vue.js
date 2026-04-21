import { ref, watch, computed } from 'vue';
import { supabase } from './supabase';
import SpoSelector from './components/SpoSelector.vue';
import ModuleList from './components/ModuleList.vue';
const spos = ref([]);
const selectedSpoId = ref(Number(localStorage.getItem('selectedSpoId')) || null);
const modules = ref([]);
const loadingSpos = ref(false);
const loadingModules = ref(false);
const error = ref(null);
const totalEcts = computed(() => modules.value.reduce((s, m) => s + (m.ects ?? 0), 0));
const mandatoryCount = computed(() => modules.value.filter(m => m.is_mandatory).length);
const electiveCount = computed(() => modules.value.filter(m => !m.is_mandatory).length);
async function fetchSpos() {
    loadingSpos.value = true;
    error.value = null;
    const { data, error: err } = await supabase.from('spos').select('*').order('valid_from');
    loadingSpos.value = false;
    if (err) {
        error.value = err.message;
        return;
    }
    spos.value = data;
}
async function fetchModules(spoId) {
    loadingModules.value = true;
    error.value = null;
    const { data, error: err } = await supabase
        .from('spo_modules')
        .select('is_mandatory, module_group, modules(*)')
        .eq('spo_id', spoId)
        .order('semester_recommendation', { foreignTable: 'modules' });
    loadingModules.value = false;
    if (err) {
        error.value = err.message;
        return;
    }
    modules.value = data.map(row => ({
        ...row.modules,
        is_mandatory: row.is_mandatory,
        module_group: row.module_group,
    }));
}
watch(selectedSpoId, (id) => {
    localStorage.setItem('selectedSpoId', id != null ? String(id) : '');
    if (id != null)
        fetchModules(id);
    else
        modules.value = [];
}, { immediate: true });
fetchSpos();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
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
    modelValue: (__VLS_ctx.selectedSpoId),
    spos: (__VLS_ctx.spos),
    loading: (__VLS_ctx.loadingSpos),
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.selectedSpoId),
    spos: (__VLS_ctx.spos),
    loading: (__VLS_ctx.loadingSpos),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-banner" },
    });
    /** @type {__VLS_StyleScopedClasses['error-banner']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.selectedSpoId && !__VLS_ctx.loadingModules) {
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
    (__VLS_ctx.totalEcts);
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
    (__VLS_ctx.mandatoryCount);
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
    (__VLS_ctx.electiveCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    const __VLS_5 = ModuleList;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        modules: (__VLS_ctx.modules),
    }));
    const __VLS_7 = __VLS_6({
        modules: (__VLS_ctx.modules),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else if (__VLS_ctx.loadingModules) {
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
else if (!__VLS_ctx.selectedSpoId) {
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
// @ts-ignore
[selectedSpoId, selectedSpoId, selectedSpoId, spos, loadingSpos, error, error, loadingModules, loadingModules, modules, modules, totalEcts, mandatoryCount, electiveCount,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

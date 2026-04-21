import { computed } from 'vue';
import ModuleCard from './ModuleCard.vue';
const props = defineProps();
const bySemester = computed(() => {
    const map = new Map();
    for (const m of props.modules) {
        const key = m.semester_recommendation ?? 99;
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
});
function semesterLabel(sem) {
    return sem === 99 ? 'Ohne Semesterzuordnung' : `${sem}. Semester`;
}
function totalEcts(modules) {
    return modules.reduce((sum, m) => sum + (m.ects ?? 0), 0);
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "module-list" },
});
/** @type {__VLS_StyleScopedClasses['module-list']} */ ;
for (const [[sem, mods]] of __VLS_vFor((__VLS_ctx.bySemester))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (sem),
        ...{ class: "semester-group" },
    });
    /** @type {__VLS_StyleScopedClasses['semester-group']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "semester-header" },
    });
    /** @type {__VLS_StyleScopedClasses['semester-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "semester-title" },
    });
    /** @type {__VLS_StyleScopedClasses['semester-title']} */ ;
    (__VLS_ctx.semesterLabel(sem));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "semester-ects" },
    });
    /** @type {__VLS_StyleScopedClasses['semester-ects']} */ ;
    (__VLS_ctx.totalEcts(mods));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "semester-modules" },
    });
    /** @type {__VLS_StyleScopedClasses['semester-modules']} */ ;
    for (const [m] of __VLS_vFor((mods))) {
        const __VLS_0 = ModuleCard;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            key: (m.id),
            module: (m),
        }));
        const __VLS_2 = __VLS_1({
            key: (m.id),
            module: (m),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        // @ts-ignore
        [bySemester, semesterLabel, totalEcts,];
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

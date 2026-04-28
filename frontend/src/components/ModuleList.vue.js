import { computed } from 'vue';
import ModuleCard from './ModuleCard.vue';
const props = defineProps();
const emit = defineEmits();
const bySemester = computed(() => {
    const map = new Map();
    for (const m of props.modules) {
        const key = m.recommended_semester ?? 99;
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
});
function semesterLabel(sem) {
    return sem === 99 ? 'Ohne Semesterzuordnung' : `${sem}. Semester`;
}
function totalEcts(mods) {
    return mods.reduce((s, m) => s + m.courses.reduce((cs, c) => cs + (c.ects ?? 0), 0), 0);
}
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
            ...{ 'onSelect': {} },
            key: (m.id),
            module: (m),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onSelect': {} },
            key: (m.id),
            module: (m),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_5;
        const __VLS_6 = ({ select: {} },
            { onSelect: (...[$event]) => {
                    __VLS_ctx.emit('select', $event);
                    // @ts-ignore
                    [bySemester, semesterLabel, totalEcts, emit,];
                } });
        var __VLS_3;
        var __VLS_4;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

import { computed } from 'vue';
const props = defineProps();
const emit = defineEmits();
const totalEcts = computed(() => props.module.courses.reduce((s, c) => s + (c.ects ?? 0), 0));
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
/** @type {__VLS_StyleScopedClasses['module-card']} */ ;
/** @type {__VLS_StyleScopedClasses['course-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['course-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['course-chip']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('select', __VLS_ctx.module);
            // @ts-ignore
            [emit, module,];
        } },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.emit('select', __VLS_ctx.module);
            // @ts-ignore
            [emit, module,];
        } },
    ...{ class: "module-card" },
    role: "button",
    tabindex: "0",
});
/** @type {__VLS_StyleScopedClasses['module-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-left" },
});
/** @type {__VLS_StyleScopedClasses['card-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "module-code" },
});
/** @type {__VLS_StyleScopedClasses['module-code']} */ ;
(__VLS_ctx.module.code);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-body" },
});
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "module-name" },
});
/** @type {__VLS_StyleScopedClasses['module-name']} */ ;
(__VLS_ctx.module.name);
if (__VLS_ctx.module.courses.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "courses" },
    });
    /** @type {__VLS_StyleScopedClasses['courses']} */ ;
    for (const [c] of __VLS_vFor((__VLS_ctx.module.courses))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (c.id),
            ...{ class: "course-chip" },
            ...{ class: (c.course_type.toLowerCase()) },
        });
        /** @type {__VLS_StyleScopedClasses['course-chip']} */ ;
        (c.name);
        (c.ects);
        // @ts-ignore
        [module, module, module, module,];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-right" },
});
/** @type {__VLS_StyleScopedClasses['card-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "ects-badge" },
});
/** @type {__VLS_StyleScopedClasses['ects-badge']} */ ;
(__VLS_ctx.totalEcts);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "coordinator" },
});
/** @type {__VLS_StyleScopedClasses['coordinator']} */ ;
(__VLS_ctx.module.coordinator);
// @ts-ignore
[module, totalEcts,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

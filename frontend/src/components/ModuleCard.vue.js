const __VLS_props = defineProps();
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['module-card']} */ ;
/** @type {__VLS_StyleScopedClasses['module-card']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['optional']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "module-card" },
    ...{ class: ({ optional: !__VLS_ctx.module.is_mandatory }) },
});
/** @type {__VLS_StyleScopedClasses['module-card']} */ ;
/** @type {__VLS_StyleScopedClasses['optional']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-left" },
});
/** @type {__VLS_StyleScopedClasses['card-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "short-name" },
});
/** @type {__VLS_StyleScopedClasses['short-name']} */ ;
(__VLS_ctx.module.short_name ?? '—');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-body" },
});
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "module-name" },
});
/** @type {__VLS_StyleScopedClasses['module-name']} */ ;
(__VLS_ctx.module.name);
if (__VLS_ctx.module.description) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "module-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['module-desc']} */ ;
    (__VLS_ctx.module.description);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "card-right" },
});
/** @type {__VLS_StyleScopedClasses['card-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "ects-badge" },
});
/** @type {__VLS_StyleScopedClasses['ects-badge']} */ ;
(__VLS_ctx.module.ects);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "type-badge" },
    ...{ class: (__VLS_ctx.module.is_mandatory ? 'mandatory' : 'optional') },
});
/** @type {__VLS_StyleScopedClasses['type-badge']} */ ;
(__VLS_ctx.module.is_mandatory ? 'Pflicht' : 'WP');
// @ts-ignore
[module, module, module, module, module, module, module, module,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};

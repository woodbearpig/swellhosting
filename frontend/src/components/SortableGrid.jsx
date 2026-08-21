import { useCallback } from 'react';
import {
    DndContext,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * SortableGrid — reusable drag-and-drop grid wrapper.
 *
 * Any admin list with an `order` field (gallery, backdrops, services,
 * testimonials, FAQs, etc.) can be wrapped in this component to get
 * drag-to-reorder for free. Consumer supplies:
 *   • items — array of objects with `id` field, in current visible order
 *   • renderItem(item, dragHandle) — how to render each card. The
 *     `dragHandle` prop is a JSX element the consumer should place
 *     somewhere on the card (typically a small grip icon). Only that
 *     element listens for drag events, so clicks elsewhere on the card
 *     (like the checkbox for bulk-select) still work.
 *   • onReorder(newItemsInOrder) — callback fired AFTER a drop with the
 *     items in their new order. Consumer decides how to persist.
 *   • className — passed to the outer grid div (Tailwind grid classes,
 *     etc.). Falls back to a sensible responsive grid.
 *
 * Accessibility: keyboard nav supported via @dnd-kit/sortable's
 * `sortableKeyboardCoordinates` — Tab to a handle, press Space to
 * pick up, Arrow keys to move, Space again to drop.
 */
export const SortableGrid = ({
    items,
    renderItem,
    onReorder,
    className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
    disabled = false,
}) => {
    const sensors = useSensors(
        // Small distance requirement so accidental micro-drags on a click
        // aren't misinterpreted as reorders (e.g., clicking the checkbox).
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const next = arrayMove(items, oldIndex, newIndex);
        onReorder(next);
    }, [items, onReorder]);

    // In disabled mode (e.g., during a save round-trip), render the plain
    // grid without DndContext so a stale drag can't fire mid-save.
    if (disabled) {
        return (
            <div className={className} data-testid="sortable-grid-disabled">
                {items.map(item => renderItem(item, null))}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className={className} data-testid="sortable-grid">
                    {items.map(item => (
                        <SortableItem key={item.id} id={item.id}>
                            {(dragHandleProps) => renderItem(item, (
                                <button
                                    type="button"
                                    aria-label={`Drag to reorder ${item.title || item.name || 'item'}`}
                                    {...dragHandleProps}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white/90 border border-white/90 text-[color:var(--brand-text)] shadow-sm hover:bg-white cursor-grab active:cursor-grabbing touch-none"
                                    data-testid="sortable-drag-handle"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </button>
                            ))}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};

/**
 * SortableItem — internal wrapper that binds a single card to dnd-kit's
 * sortable primitives. The consumer's `renderItem` gets called with the
 * `dragHandleProps` bag which they attach to whatever element should be
 * the drag handle (usually a small grip icon in a corner).
 */
const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // While actively being dragged, raise the item above others so it
        // renders on top of neighbours (rather than being clipped by them).
        zIndex: isDragging ? 40 : 'auto',
        opacity: isDragging ? 0.85 : 1,
    };

    // Combine dnd-kit's listeners with the activator ref so we can pass
    // both to the consumer's chosen handle element.
    const dragHandleProps = {
        ref: setActivatorNodeRef,
        ...listeners,
        ...attributes,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children(dragHandleProps)}
        </div>
    );
};

export default SortableGrid;

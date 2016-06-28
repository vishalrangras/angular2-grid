import {
    Component,
    OnInit,
    OnChanges,
    Input,
    ViewChild, ComponentFactory,
} from '@angular/core';

import {
    NgGridItem,
} from '../ng-grid-item/NgGridItem';

import {GridDragService} from '../../service/GridDragService';

import {
    NgGrid,
} from './NgGrid';
import {Subject} from "rxjs/Rx";
import {NgGridItemConfig} from "../ng-grid-item/NgGridItemConfig";
import {GridPositionService} from "../../service/GridPositionService";

@Component({
    selector: 'ngGrid',
    inputs: [
        'items: items',
        'config: config',
    ],
    directives: [
        NgGridItem,
        NgGrid,
    ],
    template: `
        <div [ngGrid]="config">
            <div [ngGridItem]="item"
                 *ngFor="let item of items; let i = index"
                 id="gridItem_{{i}}">
            </div>
        </div>
    `,
    host: {
        '(mousemove)': 'mouseMove$.next(toObserverEvent($event))',
        '(mousedown)': 'mouseDown($event)',
        '(dragover)': 'dragOver($event)',
        '(drop)': 'drop($event)',
    },
})
export class NgGridComponent implements OnInit, OnChanges {
    @ViewChild(NgGrid)
    public ngGrid:NgGrid;

    @Input()
    private items:any[] = [];

    public mouseMove$:Subject<any> = new Subject();
    public dragOver$:Subject<any> = new Subject();
    public newItemAdd$:Subject<any> = new Subject();

    constructor(private gridDragService:GridDragService, private gridPositionService:GridPositionService) {
    }

    ngOnInit() {
        const dragSubscriptors = this.gridDragService.addGrid(this);
        dragSubscriptors.inside.subscribe(v => {
            if (this.gridDragService.draggedItem) {
                setTimeout(() => {
                    if (!this.ngGrid._placeholderRef) {
                        this.ngGrid._createPlaceholder(v.itemDragged.item);
                    } else {
                        const {left, top} = this.ngGrid._getMousePosition(v.itemDragged.event.event);
                        const i = this.ngGrid._calculateGridPosition(left, top);
                        this.ngGrid._placeholderRef.instance.setGridPosition(i.col, i.row, v.itemDragged.item);
                    }
                });
            }
        });
        dragSubscriptors.outside.subscribe(v => {

            // this.gridDragService.refreshAll()
        });
        dragSubscriptors.release.subscribe(v => {
            const {left, top} = this.ngGrid._getMousePosition(v.move.event);
            const i = this.ngGrid._calculateGridPosition(left, top);
            let conf = Object.assign({}, v.release.item.config);
            conf.col = i.col;
            conf.row = i.row;

            if (this.gridPositionService.validateGridPosition(conf.col, conf.row, v.release.item) && !this.hasCollisions(conf)) {
                this.addItem(conf);
                this.newItemAdd$.next({
                    grid: this,
                    item: v.release.item,
                });
            }
            v.release.item.stopMoving();
            this.ngGrid._placeholderRef.destroy();
            this.ngGrid._placeholderRef = undefined;
            this.gridDragService.refreshAll();
        });
    }

    ngOnChanges(changes:any) {
        if (changes.items) {
            this.injectItems(this.items);
        }
    }

    private hasCollisions(itemConf:NgGridItemConfig):boolean {
        return this.items.some((conf:NgGridItemConfig) => intersect(
            toRectangle(conf), toRectangle(itemConf)
        ));

        function intersect(r1, r2) {
            return !(r2.left > r1.right ||
            r2.right < r1.left ||
            r2.top > r1.bottom ||
            r2.bottom < r1.top);
        }

        function toRectangle(conf:NgGridItemConfig) {
            return {
                left: conf.col,
                top: conf.row,
                right: conf.col + conf.sizex - 1,
                bottom: conf.row + conf.sizey - 1
            };
        }
    }

    private dragOver(e) {
        e.preventDefault();
    }

    private drop(e) {
        const content = this.gridDragService.dragItemConf;
        this.gridDragService.dragItemConf = null;
        if (content) {
            const {left, top} = this.ngGrid._getMousePosition(e);
            const i = this.ngGrid._calculateGridPosition(left, top);
            // if (this.ngGrid)
            content.col = i.col;
            content.row = i.row;
            this.addItem(content);
        }
    }

    public removeItem(item:NgGridItemConfig) {
        setTimeout(() => {
            let removed = false;
            this.items = this.items.filter(i => {
                if (i.col == item.col && i.row == item.row && !removed) {
                    removed = true;
                    return false;
                } else {
                    return true;
                }
            });
            this.injectItems(this.items);
        });
    }

    public addItem(item:NgGridItemConfig) {
        setTimeout(() => {
            this.items = this.items.concat([item]);
            this.injectItems(this.items);
        });
    }

    private mouseDown(e) {
        const i = this.ngGrid._getItemFromPosition(this.ngGrid._getMousePosition(e));
        if (i && i.canDrag(e)) {
            this.gridDragService.dragStart(i, this, e);
        }
        // return false;
    }

    private toObserverEvent(event) {
        return {
            grid: this,
            event,
        };
    }

    private injectItems(items:any[]):void {
        setTimeout(() => {
            items.forEach((item, index) => this.ngGrid.injectItem(item.component.type, `gridItem_${index}`, item.component.data));
        });
    }
}
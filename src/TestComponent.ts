/**
 * Created by tudorgergely on 5/24/16.
 */
import {
    Component, Input, ChangeDetectorRef, OnInit,
} from '@angular/core';

@Component({
    selector: 'testComponent',
    template: `
        <div style="width: 100px; height: 100px; background: red;">Hello, {{name}}</div>
    `,
})
export class TestComponent implements OnInit {
    name:string = 'aa';

    constructor(private changeDetectorRef:ChangeDetectorRef) {
    }

    ngOnInit() {
        this.changeDetectorRef.detectChanges();
    }
}
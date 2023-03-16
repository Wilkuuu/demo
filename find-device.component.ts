import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { Result, BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MainService } from '../service/main.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgForm } from '@angular/forms';
import {  Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';


@Component({
    selector: 'app-find-device',
    templateUrl: './find-device.component.html',
    styleUrls: ['./find-device.component.scss']
})
export class FindDeviceComponent implements OnInit{

    allowedFormats = [BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.CODE_128, BarcodeFormat.DATA_MATRIX /*, ...*/];
    formatsEnabled: BarcodeFormat[] = [
        BarcodeFormat.CODE_128,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.EAN_13,
        BarcodeFormat.QR_CODE,
    ];
    currentDevice: MediaDeviceInfo = null;

    @Input() customerData = {companyName: '', billingCompanyName: ''}

    @ViewChild('scanner') scanner: ZXingScannerComponent;
    @ViewChild('eventModal') eventModal;
    @ViewChild('errorModal') errorModal;

    hasDevices: boolean;
    hasPermission: boolean;
    qrResultString: string = null;
    qrResult: Result;

    changeStatusButton = false;
    deviceStatus;
    deviceInfo = {isMobile: true, isDesktop: false};


    device: Interfaces.DeviceInterface = {
        idx: null,
        name: null,
        company: {idx: null, name: null, description: null},
        status: {idx: null, name: null, description: null},
        serialNumber: null,
        description: null
    };


    torchAvailable$ = new BehaviorSubject<boolean>(false);

    availableDevices: MediaDeviceInfo[] = [];


    constructor(private toastr: ToastrService,
                private deviceService: DeviceDetectorService,
                private router: Router,
                public mainService: MainService,
                private modalService: NgbModal) {
    }

    ngOnInit() {
        this.deviceDetection();
        this.mainService.getAllStatuses().subscribe((res: any) => {
            this.deviceStatus = res.body;
        });
    }

    clearResult(): void {
        this.qrResultString = null;
    }

    onDeviceSelectChange(selected: string) {
        const device = this.availableDevices.find(x => x.deviceId === selected);
        this.currentDevice = device || null;
    }

    onCamerasFound(devices: MediaDeviceInfo[]): void {
        this.availableDevices = devices;
        this.hasDevices = !!(devices && devices.length);
        this.availableDevices.forEach(el => {
            if (el.label.indexOf('back') > 0) {
                this.currentDevice = el;
            } else {
                this.currentDevice = this.availableDevices[0];
            }
        });
    }


    onCodeResult(resultString: string) {
        if (resultString !== this.qrResultString) {
            this.qrResultString = resultString;
            this.mainService.getDevice(resultString).subscribe((res: any) => {
                this.device = res.body;
                if (this.device) {
                    this.modalService.open(this.eventModal, {
                        size: this.getModalSize(), backdrop: 'static',
                        keyboard: false
                    });
                } else {
                    this.closeModal();
                    this.router.navigate(['/addDevice'], {queryParams: {haveSn: true, sn: resultString}});
                }
            }, error => {
                    this.modalService.open(this.errorModal, {
                        size: this.getModalSize(), backdrop: 'static',
                        keyboard: false
                    });
            });
        }
    }


    deviceDetection() {
        {
            this.deviceInfo.isMobile = this.deviceService.isMobile();
            this.deviceInfo.isDesktop = this.deviceService.isDesktop();
        }
    }

    getModalSize() {
        if (this.deviceInfo.isMobile) {
            return 'sm';
        } else {
            return 'lg';
        }
    }

    onHasPermission(has: boolean) {
        this.hasPermission = has;
    }

    onTorchCompatible(isCompatible: boolean): void {
        this.torchAvailable$.next(isCompatible || false);
    }


    closeModal() {
        this.clearResult();
        this.modalService.dismissAll();
    }

    remove() {
        this.changeStatusButton = !this.changeStatusButton;
    }

    onSubmit(form: NgForm) {
        this.device.dateOut = new Date().toUTCString();
        this.mainService.update(this.device.idx, this.device).subscribe((res: any) => {
        }, error => console.log(error), () => {
            this.closeModal();
            this.router.navigate(['/checkList']);
        });
    }

    getCompanyNames(): string {
        const {companyName, billingCompanyName} = this.customerData;
        let companies: string[] = [...new Set([companyName || '', billingCompanyName || ''])];
        return companies.filter(e => !!e).join(', ');
    }


}

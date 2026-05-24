import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuctionService, CreateAuctionInput } from '../../services/auction.service';

type AuctionPublishMode = 'ACTIVE' | 'DRAFT';

interface AuctionCreateDraft {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  condition: CreateAuctionInput['condition'];
  imageUrl: string;
  galleryText: string;
  startingPrice: number;
  minIncrement: number;
  buyNowPrice: number;
  reservePrice: number;
  durationMinutes: number;
  sellerName: string;
  location: string;
  shipping: Record<string, boolean>;
  payment: Record<string, boolean>;
  legalAccepted: boolean;
}

@Component({
  selector: 'app-auction-create-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './auction-create-editor.component.html',
  styleUrls: ['./auction-create-editor.component.scss'],
})
export class AuctionCreateEditorComponent {
  message = '';
  error = '';
  busy = false;
  lastCreatedId = '';

  readonly categories = [
    'Aukce elektroniky',
    'Aukce sběratelství',
    'Aukce vozidel',
    'Aukce domácnosti',
    'Aukce sportu',
    'Aukce ostatní',
  ];

  readonly durationOptions = [
    { value: 30, label: '30 minut' },
    { value: 60, label: '1 hodina' },
    { value: 360, label: '6 hodin' },
    { value: 1440, label: '1 den' },
    { value: 4320, label: '3 dny' },
    { value: 10080, label: '7 dní' },
  ];

  readonly shippingOptions = [
    { id: 'pickup', label: 'Osobní předání' },
    { id: 'parcel', label: 'Balíkovna / Zásilkovna' },
    { id: 'courier', label: 'Kurýr' },
    { id: 'sellerDelivery', label: 'Doprava prodejcem' },
  ];

  readonly paymentOptions = [
    { id: 'bankTransfer', label: 'Bankovní převod' },
    { id: 'cash', label: 'Hotově při převzetí' },
    { id: 'trezzoWallet', label: 'Trezzo Wallet' },
    { id: 'card', label: 'Karta online' },
  ];

  draft: AuctionCreateDraft = this.createEmptyDraft();

  constructor(private auctionService: AuctionService) {}

  get galleryItems(): string[] {
    return this.parseLines(this.draft.galleryText).slice(0, 12);
  }

  get selectedShipping(): string[] {
    return this.shippingOptions
      .filter((item) => !!this.draft.shipping[item.id])
      .map((item) => item.label);
  }

  get selectedPayment(): string[] {
    return this.paymentOptions
      .filter((item) => !!this.draft.payment[item.id])
      .map((item) => item.label);
  }

  get primaryImageUrl(): string {
    return String(this.draft.imageUrl || this.galleryItems[0] || '').trim();
  }

  get buyNowValue(): number | null {
    const value = Math.floor(Number(this.draft.buyNowPrice || 0));
    return value > 0 ? value : null;
  }

  get reserveValue(): number | null {
    const value = Math.floor(Number(this.draft.reservePrice || 0));
    return value > 0 ? value : null;
  }

  get canSubmit(): boolean {
    return (
      !this.busy &&
      !!this.draft.title.trim() &&
      !!this.draft.description.trim() &&
      Number(this.draft.startingPrice || 0) >= 1 &&
      Number(this.draft.minIncrement || 0) >= 1 &&
      Number(this.draft.durationMinutes || 0) >= 5 &&
      this.draft.legalAccepted
    );
  }

  publishAuction(): void {
    this.createAuction('ACTIVE');
  }

  saveDraft(): void {
    this.createAuction('DRAFT');
  }

  createAuction(mode: AuctionPublishMode = 'ACTIVE'): void {
    this.message = '';
    this.error = '';

    const validation = this.validateDraft(mode);
    if (validation) {
      this.error = validation;
      return;
    }

    const payload: CreateAuctionInput = {
      title: this.draft.title.trim(),
      subtitle: this.draft.subtitle.trim(),
      description: this.draft.description.trim(),
      category: this.draft.category,
      imageUrl: this.primaryImageUrl,
      gallery: this.galleryItems,
      startingPrice: Math.floor(Number(this.draft.startingPrice || 0)),
      minIncrement: Math.floor(Number(this.draft.minIncrement || 0)),
      buyNowPrice: this.buyNowValue,
      reservePrice: this.reserveValue,
      durationMinutes: Math.floor(Number(this.draft.durationMinutes || 60)),
      condition: this.draft.condition,
      sellerName: this.draft.sellerName.trim() || 'Trezzo prodejce',
      location: this.draft.location.trim(),
      shipping: this.selectedShipping,
      payment: this.selectedPayment,
      status: mode,
      legalAccepted: this.draft.legalAccepted,
    };

    this.busy = true;

    this.auctionService.createAuction(payload).subscribe((result) => {
      this.busy = false;
      this.message = result.message;
      this.error = result.ok ? '' : result.message;

      if (result.ok && result.auction) {
        this.lastCreatedId = result.auction.id;
        this.draft = this.createEmptyDraft();
      }
    });
  }

  toggleShipping(id: string): void {
    this.draft.shipping[id] = !this.draft.shipping[id];
  }

  togglePayment(id: string): void {
    this.draft.payment[id] = !this.draft.payment[id];
  }

  private validateDraft(mode: AuctionPublishMode): string {
    if (!this.draft.title.trim()) return 'Doplň název aukce.';
    if (!this.draft.description.trim()) return 'Doplň detailní popis aukce.';
    if (Number(this.draft.startingPrice || 0) < 1) return 'Vyvolávací cena musí být minimálně 1 Kč.';
    if (Number(this.draft.minIncrement || 0) < 1) return 'Minimální příhoz musí být minimálně 1 Kč.';
    if (Number(this.draft.durationMinutes || 0) < 5) return 'Délka aukce musí být minimálně 5 minut.';
    if (this.buyNowValue != null && this.buyNowValue < Number(this.draft.startingPrice || 0)) {
      return 'Kup teď cena nesmí být nižší než vyvolávací cena.';
    }
    if (mode === 'ACTIVE' && !this.draft.legalAccepted) {
      return 'Před publikací musíš potvrdit právní prohlášení.';
    }
    return '';
  }

  private parseLines(value: string): string[] {
    return String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private createEmptyDraft(): AuctionCreateDraft {
    return {
      title: '',
      subtitle: '',
      description: '',
      category: 'Aukce elektroniky',
      condition: 'USED',
      imageUrl: '',
      galleryText: '',
      startingPrice: 100,
      minIncrement: 50,
      buyNowPrice: 0,
      reservePrice: 0,
      durationMinutes: 1440,
      sellerName: 'Trezzo prodejce',
      location: 'Olomouc',
      shipping: {
        pickup: true,
        parcel: true,
        courier: false,
        sellerDelivery: false,
      },
      payment: {
        bankTransfer: true,
        cash: false,
        trezzoWallet: true,
        card: false,
      },
      legalAccepted: false,
    };
  }
}

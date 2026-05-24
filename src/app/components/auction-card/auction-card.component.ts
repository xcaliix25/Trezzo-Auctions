import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, Input } from '@angular/core';
import { Auction, AuctionService } from '../../services/auction.service';
import { BidFormComponent } from '../bid-form/bid-form.component';

@Component({
  selector: 'app-auction-card',
  imports: [CommonModule, RouterLink, BidFormComponent],
  templateUrl: './auction-card.component.html',
  styleUrls: ['./auction-card.component.scss'],
})
export class AuctionCardComponent {
  @Input({ required: true }) auction!: Auction;

  buyNowBusy = false;
  buyNowMessage = '';

  constructor(public auctionService: AuctionService) {}

  get timeLeftLabel(): string {
    const diff = this.auction.endTime.getTime() - Date.now();

    if (diff <= 0 || this.auction.status === 'ENDED') return 'Aukce skončila';
    if (this.auction.status === 'SOLD') return 'Prodáno';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (days > 0) return `${days} d ${hours} h`;
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  get conditionLabel(): string {
    const labels: Record<Auction['condition'], string> = {
      NEW: 'Nové',
      LIKE_NEW: 'Jako nové',
      USED: 'Použité',
      DAMAGED: 'Poškozené',
    };

    return labels[this.auction.condition] || 'Neuvedeno';
  }

  get minimumBidLabel(): string {
    return this.auctionService.formatMoney(
      this.auctionService.getMinimumNextBid(this.auction),
    );
  }

  get buyNowPriceLabel(): string {
    return this.auction.buyNowPrice
      ? this.auctionService.formatMoney(this.auction.buyNowPrice)
      : '';
  }

  get isEndingSoon(): boolean {
    const diff = this.auction.endTime.getTime() - Date.now();
    return diff > 0 && diff <= 1000 * 60 * 60 * 6;
  }

  get isSold(): boolean {
    return this.auction.status === 'SOLD';
  }

  get isEnded(): boolean {
    return this.auction.status === 'ENDED' || this.auction.endTime.getTime() <= Date.now();
  }

  get canAct(): boolean {
    return !!this.auction?.id && !this.isSold && !this.isEnded && this.auction.status !== 'CANCELLED';
  }

  get progressPercent(): number {
    const start = Number(this.auction.startingPrice || 0);
    const current = Number(this.auction.currentBid || 0);
    const reserve = Number(this.auction.reservePrice || this.auction.buyNowPrice || current || start || 1);
    if (!reserve) return 0;
    return Math.max(4, Math.min(100, Math.round((current / reserve) * 100)));
  }

  onAuctionChange(auction: Auction): void {
    this.auction = auction;
    this.buyNowMessage = '';
  }

  buyNow(): void {
    if (!this.canAct || !this.auction.buyNowPrice || this.buyNowBusy) return;

    this.buyNowBusy = true;
    this.buyNowMessage = '';

    this.auctionService.buyNow(this.auction.id).subscribe((result) => {
      this.buyNowBusy = false;
      this.buyNowMessage = result.message;
      if (result.auction) this.auction = result.auction;
    });
  }
}

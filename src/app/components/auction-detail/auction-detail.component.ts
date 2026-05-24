import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auction, AuctionService } from '../../services/auction.service';
import { BidFormComponent } from '../bid-form/bid-form.component';

@Component({
  selector: 'app-auction-detail',
  imports: [CommonModule, RouterLink, BidFormComponent],
  templateUrl: './auction-detail.component.html',
  styleUrls: ['./auction-detail.component.scss'],
})
export class AuctionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);

  auction: Auction | null = null;
  message = '';
  buyNowBusy = false;

  constructor(public auctionService: AuctionService) {}

  ngOnInit(): void {
    const id = String(this.route.snapshot.paramMap.get('id') || '');
    this.auctionService.getAuctionById(id).subscribe((auction) => {
      this.auction = auction;
    });
  }

  get timeLeftLabel(): string {
    if (!this.auction) return '';

    const diff = this.auction.endTime.getTime() - Date.now();
    if (diff <= 0 || this.auction.status === 'ENDED') return 'Aukce skončila';
    if (this.auction.status === 'SOLD') return 'Prodáno';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days} d ${hours} h`;
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${minutes} min`;
  }

  get canAct(): boolean {
    if (!this.auction) return false;
    return !['ENDED', 'SOLD', 'CANCELLED'].includes(this.auction.status) &&
      this.auction.endTime.getTime() > Date.now();
  }

  get gallery(): string[] {
    if (!this.auction) return [];
    const items = [
      this.auction.imageUrl,
      ...(Array.isArray(this.auction.gallery) ? this.auction.gallery : []),
    ];
    return Array.from(new Set(items.filter(Boolean)));
  }

  get minimumBidLabel(): string {
    if (!this.auction) return '';
    return this.auctionService.formatMoney(this.auctionService.getMinimumNextBid(this.auction));
  }

  buyNow(): void {
    if (!this.auction || !this.canAct || !this.auction.buyNowPrice || this.buyNowBusy) return;

    this.buyNowBusy = true;
    this.message = '';

    this.auctionService.buyNow(this.auction.id).subscribe((result) => {
      this.buyNowBusy = false;
      this.message = result.message;
      if (result.auction) this.auction = result.auction;
    });
  }

  onAuctionChange(auction: Auction): void {
    this.auction = auction;
    this.message = '';
  }

  trackBid(_index: number, bid: { id: string }): string {
    return bid.id;
  }

  trackGallery(_index: number, item: string): string {
    return item;
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auction, AuctionService } from '../../services/auction.service';

@Component({
  selector: 'app-bid-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './bid-form.component.html',
  styleUrls: ['./bid-form.component.scss'],
})
export class BidFormComponent implements OnChanges {
  @Input({ required: true }) auction!: Auction;
  @Output() auctionChange = new EventEmitter<Auction>();

  bidAmount = 0;
  message = '';
  busy = false;

  constructor(public auctionService: AuctionService) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.bidAmount && this.auction) {
      this.bidAmount = this.auctionService.getMinimumNextBid(this.auction);
    }
  }

  get minimumBid(): number {
    return this.auction ? this.auctionService.getMinimumNextBid(this.auction) : 1;
  }

  get minimumBidLabel(): string {
    return this.auctionService.formatMoney(this.minimumBid);
  }

  get canBid(): boolean {
    return !!this.auction?.id && !this.busy && !['ENDED', 'SOLD', 'CANCELLED'].includes(this.auction.status);
  }

  fillMinimum(): void {
    this.bidAmount = this.minimumBid;
  }

  increaseBid(multiplier = 1): void {
    const increment = Number(this.auction?.minIncrement || 100) * multiplier;
    this.bidAmount = Math.max(this.minimumBid, Number(this.bidAmount || this.minimumBid) + increment);
  }

  placeBid(): void {
    if (!this.canBid) return;

    const amount = Math.floor(Number(this.bidAmount || 0));
    if (amount < this.minimumBid) {
      this.message = `Minimální příhoz je ${this.minimumBidLabel}.`;
      this.bidAmount = this.minimumBid;
      return;
    }

    this.busy = true;
    this.message = '';

    this.auctionService.placeBid(this.auction.id, amount).subscribe((result) => {
      this.busy = false;
      this.message = result.message;

      if (result.auction) {
        this.auction = result.auction;
        this.auctionChange.emit(result.auction);
        this.bidAmount = this.auctionService.getMinimumNextBid(result.auction);
      }
    });
  }
}

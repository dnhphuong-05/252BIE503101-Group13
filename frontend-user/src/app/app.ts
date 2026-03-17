import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatboxWidgetComponent } from './shared/components/chatbox-widget/chatbox-widget';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatboxWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('frontend-user');
}

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteAnimationComponent } from './route-animation/route-animation';
import { SimpleMapComponent } from './simple-map/simple-map.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouteAnimationComponent, SimpleMapComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('mapaanimated');
}

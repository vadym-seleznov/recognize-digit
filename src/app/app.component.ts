import {Component, OnInit} from '@angular/core';
import {Prediction} from './Prediction';

import * as tf from '@tensorflow/tfjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  title = 'recognize-digit';
  model: tf.LayersModel;
  predictions: Prediction[] = [];
  array: any[][];

  ngOnInit(): void {
    this.loadModel();
  }

  async loadModel() {
    this.model = await tf.loadLayersModel('./assets/model.json');
  }

  onImageUpload(imageUrl: any) {
    const prediction = new Prediction();
    prediction.uploadedImageUrl = imageUrl;
    prediction.prediction = '...';
    this.predictions.unshift(prediction);

    const image = new Image();
    const self = this;
    image.onload = function() {
      self.predict(this, prediction);
    };
    image.src = imageUrl;
  }

  async predict(imageData: any, prediction: Prediction) {
    const pred = await tf.tidy(() => {
      const img = tf.browser.fromPixels(imageData, 1);
      const resizedImg = tf.image.resizeBilinear(img, [28, 28]);
      let img2D = resizedImg.flatten().div(255).sub(1).abs();
      const hasImage = img2D.dataSync().includes(0);
      if (!hasImage) {
        return;
      }
      img2D = tf.cast(img2D, 'float32');

      this.array = [];
      for (let i = 0; i < 28; i++) {
        this.array[i] = [];
        for (let j = 0; j < 28; j++) {
          this.array[i][j] = img2D.dataSync()[28 * i + j].toFixed(2) + ' ';
        }
      }

      img2D = img2D.as2D(1, 784);
      const output = this.model.predict([img2D]) as any;

      const modelPredictions = Array.from(output.dataSync());
      setPredictionToModel(modelPredictions, prediction);
    });

    function setPredictionToModel(modelPredictions, numberPrediction) {
      numberPrediction.prediction = '...';
      numberPrediction.probability = null;
      if (modelPredictions.length === 0) {
        return;
      }

      let max = modelPredictions[0];
      let maxIndex = 0;

      for (let i = 1; i < modelPredictions.length; i++) {
        if (modelPredictions[i] > max) {
          maxIndex = i;
          max = modelPredictions[i];
        }
      }

      if (max > 0.5) {
        numberPrediction.prediction = maxIndex.toString();
        numberPrediction.probability = Math.round(max * 100);
      }
    }
  }
}

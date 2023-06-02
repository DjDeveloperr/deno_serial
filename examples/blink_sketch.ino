void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  while (Serial.available() > 0) {
    int msg = Serial.read();
    if (msg == 1) {
      digitalWrite(LED_BUILTIN, HIGH);
      Serial.println("LED  ON");
    } else if (msg == 2) {
      digitalWrite(LED_BUILTIN, LOW);
      Serial.println("LED OFF");
    }
  }
}

package it.omcr.gymtracker;
import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.ScrollView;
public class HealthPrivacyActivity extends Activity {
    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        ScrollView scroll = new ScrollView(this);
        TextView text = new TextView(this); text.setTextSize(16); text.setPadding(32,32,32,32);
        text.setText("GymTracker - Dati salute\n\nI dati autorizzati (peso, composizione corporea, sonno, passi, battito e calorie) servono al riepilogo personale e ai suggerimenti di allenamento. Sono conservati nello storico locale del telefono e inclusi negli eventuali backup JSON; i dati del Watch passano tramite Wear OS Data Layer. Non vengono inviati a un server GymTracker. L'esportazione esplicita scrive la seduta in Connessione Salute; altre app autorizzate possono leggerla.\n\nPuoi revocare i permessi dalle impostazioni di Connessione Salute, disattivare i suggerimenti e cancellare i dati importati in GymTracker. Revocare i permessi non cancella automaticamente dati gia copiati o esportati. I suggerimenti non sono valutazioni mediche. Proteggi i backup e non pubblicarli in repository pubblici.");
        scroll.addView(text); setContentView(scroll);
    }
}

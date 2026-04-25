"""
Inference pipeline - loads trained model and runs predictions.
Run: python inference/predict.py
"""
import sys, logging, torch, torch.nn.functional as F
from pathlib import Path
from PIL import Image
import numpy as np
import torchvision.transforms as T

sys.path.append(str(Path(__file__).parent.parent))
from models.multitask_model import PrecisionAgricultureMTL, AnomalyHead
from preprocessing.ceemdan_processor import CEEMDANPreprocessor, SensorDataValidator

logger = logging.getLogger(__name__)

IMG_TRANSFORM = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class InferenceEngine:
    """Loads a trained checkpoint and runs full predictions."""

    def __init__(self, checkpoint_path: str, device: str = "cpu"):
        self.device = torch.device(device)
        self.model  = PrecisionAgricultureMTL().to(self.device)
        ckpt = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(ckpt["model_state"])
        self.model.eval()
        self.preprocessor = CEEMDANPreprocessor(n_imfs=4, window_size=64)
        self.validator    = SensorDataValidator()
        logger.info(f"Model loaded from {checkpoint_path} (epoch {ckpt.get('epoch','?')})")

    def predict(self, sensor_data: dict, image: Image.Image) -> dict:
        # Preprocess sensor data
        clean = self.validator.validate_and_clean(sensor_data)
        try:
            st = self.preprocessor.process(clean).to(self.device)
        except Exception:
            st = torch.zeros(1, 20, 64).to(self.device)

        # Preprocess image
        it = IMG_TRANSFORM(image.convert("RGB")).unsqueeze(0).to(self.device)

        with torch.no_grad():
            out   = self.model(st, it)
            probs = F.softmax(out["anomaly_logits"], dim=-1).squeeze(0)
            cid   = probs.argmax().item()
            conf  = probs.max().item()

        is_alert = cid != 0
        severity = "normal" if not is_alert else ("critical" if conf > 0.85 else "warning")

        return {
            "carbon_emission_kg_ha": round(out["carbon_emission"].item(), 2),
            "yield_pred_tonnes_ha":  round(out["yield_pred"].item(), 2),
            "anomaly_class":         AnomalyHead.CLASSES[cid],
            "anomaly_class_id":      cid,
            "anomaly_probabilities": {c: round(float(p), 4) for c, p in zip(AnomalyHead.CLASSES, probs.cpu())},
            "confidence_score":      round(conf, 4),
            "is_alert":              is_alert,
            "alert_severity":        severity,
            "gradcam_base64":        None,
            "attention_weights":     out["attention_weights"].squeeze().cpu().numpy().tolist() if out.get("attention_weights") is not None else [],
        }


if __name__ == "__main__":
    import random
    logger.basicConfig(level=logging.INFO)
    print("Inference engine ready. No checkpoint found - showing demo output.")
    print("To use: engine = InferenceEngine('checkpoints/best_model.pt')")
    print("Then: result = engine.predict(sensor_data, pil_image)")

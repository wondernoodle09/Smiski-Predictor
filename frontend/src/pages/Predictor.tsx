import { useEffect, useState } from "react";
import { getCollections, type Collection } from "../api/collections";

type ShakePosition = "up_down" | "base_rotation" | "rotation_1" | "rotation_2";

type ShakeReport = {
    movement_amount: number;
    loudness: number;
    sound_type: number;
};

type PredictionInput = {
    weight: string;
    shake_reports: Record<ShakePosition, ShakeReport>;
    collection_id: string;
};

const initialShakeReport: ShakeReport = {
    movement_amount: 0,
    loudness: 0,
    sound_type: 0,
};

const shakePositions: { key: ShakePosition; label: string }[] = [
    { key: "up_down", label: "Up / Down" },
    { key: "base_rotation", label: "Base Rotation" },
    { key: "rotation_1", label: "Rotation 1" },
    { key: "rotation_2", label: "Rotation 2" },
];

function Predictor() {

    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionError, setCollectionError] = useState("");

    useEffect(() => {
        getCollections()
            .then(setCollections)
            .catch((err: unknown) => {
                if (err instanceof Error) setCollectionError(err.message);
                else setCollectionError("Failed to load collections");
            });
    }, []);

    function updateCollection(value: string) {
        setFormData((prev) => ({
            ...prev,
            collection_id: value,
        }));
    }

    const [formData, setFormData] = useState<PredictionInput>({
        collection_id: "",
        weight: "",
        shake_reports: {
            up_down: { ...initialShakeReport },
            base_rotation: { ...initialShakeReport },
            rotation_1: { ...initialShakeReport },
            rotation_2: { ...initialShakeReport },
        },
    });

    const [prediction, setPrediction] = useState<string>("");

    function updateWeight(value: string) {
        setFormData((prev) => ({
            ...prev,
            weight: value,
        }));
    }

    function updateShakeReport(
        position: ShakePosition,
        field: keyof ShakeReport,
        value: number
    ) {
        setFormData((prev) => ({
            ...prev,
            shake_reports: {
                ...prev.shake_reports,
                [position]: {
                    ...prev.shake_reports[position],
                    [field]: value,
                },
            },
        }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        console.log("Prediction input:", formData);

        setPrediction(
            "Dummy result: likely compact, low elongation, not multi-body."
        );
    }

    return (
        <section className="card">
            <h2>Predict Your Smiski</h2>
            <p>Enter as much information as you can to accurately predict your Smiski.</p>

            <form onSubmit={handleSubmit} className="predictor-form">

                <label>
                    Select Collection:
                    <select
                        value={formData.collection_id}
                        onChange={(e) => updateCollection(e.target.value)}
                    >
                        <option value="">Unknown / no collection selected</option>

                        {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                                {collection.name}
                            </option>
                        ))}
                    </select>
                </label>

                {collectionError && <p className="error">{collectionError}</p>}

                <label>
                    Weight:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => updateWeight(e.target.value)}
                        placeholder="Enter weight in grams"
                    />
                </label>

                {shakePositions.map((position) => (
                    <fieldset key={position.key} className="shake-section">
                        <legend>{position.label}</legend>

                        <label>
                            Movement amount
                            <select
                                value={formData.shake_reports[position.key].movement_amount}
                                onChange={(e) =>
                                    updateShakeReport(
                                        position.key,
                                        "movement_amount",
                                        Number(e.target.value)
                                    )
                                }
                            >
                                <option value={0}>0 — none</option>
                                <option value={1}>1 — low</option>
                                <option value={2}>2 — medium</option>
                                <option value={3}>3 — high</option>
                            </select>
                        </label>

                        <label>
                            Loudness
                            <select
                                value={formData.shake_reports[position.key].loudness}
                                onChange={(e) =>
                                    updateShakeReport(
                                        position.key,
                                        "loudness",
                                        Number(e.target.value)
                                    )
                                }
                            >
                                <option value={0}>0 — none</option>
                                <option value={1}>1 — low</option>
                                <option value={2}>2 — medium</option>
                                <option value={3}>3 — high</option>
                            </select>
                        </label>

                        <label>
                            Sound Hardness
                            <select
                                value={formData.shake_reports[position.key].sound_type}
                                onChange={(e) =>
                                    updateShakeReport(
                                        position.key,
                                        "sound_type",
                                        Number(e.target.value)
                                    )
                                }
                            >
                                <option value={0}>0 — soft</option>
                                <option value={1}>1 — mixed</option>
                                <option value={2}>2 — hard</option>
                            </select>
                        </label>
                    </fieldset>
                ))}

                <button type="submit">Get Prediction</button>
            </form>

            {prediction && (
                <div className="prediction-result">
                    <h3>Prediction</h3>
                    <p>{prediction}</p>
                </div>
            )}
        </section>
    );
}

export default Predictor;
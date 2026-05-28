import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data_referrals.json");

interface Referral {
  id: string;
  doctorName: string;
  patientName: string;
  department: string;
  bedLocation?: string;
  requestedTests?: string;
  doctorNote?: string;
  diagnosis?: string;
  complaints?: string;
  emergencyComment?: string;
  status: "აქტიური" | "მოვიდეს - დადასტურებულია" | "განხილვაშია - იხილეთ კომენტარი" | "მოვიდა - დასრულებულია";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Pre-populate with realistic clinical sample data on first run
const initialReferrals: Referral[] = [
  {
    id: "ref-1",
    doctorName: "ლაშა ჩხეიძე",
    patientName: "გიორგი მახარაძე",
    department: "კარდიოლოგია",
    bedLocation: "პალატა 312, მე-3 სართული",
    requestedTests: "ეკგ, სისხლის საერთო ანალიზი, ტროპონინის ტესტი, ექოკარდიოგრაფია",
    doctorNote: "პაციენტს აღენიშნება ტიპური სტენოკარდიული ხასიათის ტკივილი მკერდის არეში. ძლიერი სისუსტე.",
    diagnosis: "მწვავე კორონარული სინდრომი (ეჭვი)",
    complaints: "მკერდის უკანა ტკივილი, რომელიც გადაეცემა მარცხენა მხარში, სუნთქვის უკმარისობა.",
    status: "აქტიური",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "ref-2",
    doctorName: "ნათია კალანდაძე",
    patientName: "მარიამ ახვლედიანი",
    department: "ნევროლოგია",
    bedLocation: "პალატა 104, მე-1 სართული",
    requestedTests: "თავის ტვინის კომპიუტერული ტომოგრაფია (CT)",
    doctorNote: "ძლიერი და უეცარი თავის ტკივილი, თანმხლები გულისრევის შეგრძნება და მხედველობის დაბინდვა.",
    diagnosis: "ტრანზიტორული იშემიური შეტევა?",
    complaints: "ძლიერი თავის ტკივილი, მარჯვენა ხელის სისუსტე, თავბრუსხვევა.",
    emergencyComment: "საჭიროა დამატებითი კლინიკური ინფორმაცია. გთხოვთ დაუკავშირდეთ მორიგე ექიმს.",
    status: "განხილვაშია - იხილეთ კომენტარი",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "ref-3",
    doctorName: "ოთარ ქაჯაია",
    patientName: "დავით მაისურაძე",
    department: "თერაპია",
    bedLocation: "პირველი სართული, მე-5 საწოლი",
    requestedTests: "მუცლის ღრუს ულტრაბგერითი კვლევა (ექოსკოპია)",
    doctorNote: "მუცლის მწვავე ტკივილი მარჯვენა ქვედა კვადრანტში, ეჭვი მწვავე აპენდიციტზე.",
    diagnosis: "მწვავე აპენდიციტი (ეჭვი)",
    complaints: "ტკივილი ჭიპის არეში, რომელიც გადანაცვლდა მარჯვენა თეძოს მიდამოში, ცხელება 38.2°C.",
    emergencyComment: "პაციენტი თერაპიულ ბოქსშია, ექოსკოპია დაგეგმილია",
    status: "მოვიდეს - დადასტურებულია",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
  },
  {
    id: "ref-4",
    doctorName: "ლევან სამხარაძე",
    patientName: "ნიკოლოზ კაპანაძე",
    department: "ტრავმატოლოგია",
    bedLocation: "ბოქსი 2",
    requestedTests: "მარჯვენა კოჭ-წვივის სახსრის რენტგენოგრაფია ორ პროექციაში",
    doctorNote: "სიმაღლიდან გადმოხტომის შემდგომი ტრავმა, მარჯვენა კიდურის შეშუპება და დეფორმაცია.",
    diagnosis: "მარჯვენა კოჭ-წვივის სახსრის დახურული მოტეხილობა",
    complaints: "მარჯვენა ფეხის ძლიერი ტკივილი, შეშუპება, სიარულის შეუძლებლობა.",
    emergencyComment: "პაციენტი მოყვანილია სასწრაფო დახმარების მიერ. რენტგენი უკვე ჩატარდა, მოთავსდა თაბაშირში.",
    status: "მოვიდა - დასრულებულია",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];

function readData(): Referral[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialReferrals, null, 2), "utf-8");
      return initialReferrals;
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading storage file:", error);
    return [];
  }
}

function writeData(data: Referral[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing storage file:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Routes
  // 1. Get all referrals
  app.get("/api/referrals", (req, res) => {
    try {
      const referrals = readData();
      res.json(referrals);
    } catch (e) {
      res.status(500).json({ error: "სერვერის შეცდომა მონაცემების წაკითხვისას" });
    }
  });

  // 2. Add new referral
  app.post("/api/referrals", (req, res) => {
    try {
      const { doctorName, patientName, department, bedLocation, requestedTests, doctorNote, diagnosis, complaints } = req.body;

      // Validation
      if (!doctorName || !doctorName.trim()) {
        return res.status(400).json({ error: "ექიმის სახელი და გვარი სავალდებულოა" });
      }
      if (!patientName || !patientName.trim()) {
        return res.status(400).json({ error: "პაციენტის სახელი და გვარი სავალდებულოა" });
      }
      if (!department || !department.trim()) {
        return res.status(400).json({ error: "განყოფილება სავალდებულოა" });
      }

      const referrals = readData();
      const newReferral: Referral = {
        id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        doctorName: doctorName.trim(),
        patientName: patientName.trim(),
        department: department.trim(),
        bedLocation: bedLocation?.trim() || "",
        requestedTests: requestedTests?.trim() || "",
        doctorNote: doctorNote?.trim() || "",
        diagnosis: diagnosis?.trim() || "",
        complaints: complaints?.trim() || "",
        emergencyComment: "",
        status: "აქტიური",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      referrals.push(newReferral);
      writeData(referrals);

      res.status(201).json(newReferral);
    } catch (e) {
      res.status(500).json({ error: "სერვერის შეცდომა მიმართვის დამატებისას" });
    }
  });

  // 3. Update referral state/comments
  app.put("/api/referrals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, emergencyComment } = req.body;

      const referrals = readData();
      const index = referrals.findIndex((r) => r.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "მიმართვა ვერ მოიძებნა" });
      }

      const referral = referrals[index];

      if (status !== undefined) {
        referral.status = status;
        if (status === "მოვიდა - დასრულებულია") {
          referral.completedAt = new Date().toISOString();
        } else {
          delete referral.completedAt;
        }
      }

      if (emergencyComment !== undefined) {
        referral.emergencyComment = emergencyComment.trim();
      }

      referral.updatedAt = new Date().toISOString();

      referrals[index] = referral;
      writeData(referrals);

      res.json(referral);
    } catch (e) {
      res.status(500).json({ error: "სერვერის შეცდომა მიმართვის განახლებისას" });
    }
  });

  // 4. Delete referral
  app.delete("/api/referrals/:id", (req, res) => {
    try {
      const { id } = req.params;
      const referrals = readData();
      const index = referrals.findIndex((r) => r.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "მიმართვა ვერ მოიძებნა" });
      }

      const deleted = referrals.splice(index, 1)[0];
      writeData(referrals);

      res.json({ message: "წარმატებით წაიშალა", id: deleted.id });
    } catch (e) {
      res.status(500).json({ error: "სერვერის შეცდომა წაშლისას" });
    }
  });

  // Integrate Vite for development, or serve production build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV}`);
  });
}

startServer();
